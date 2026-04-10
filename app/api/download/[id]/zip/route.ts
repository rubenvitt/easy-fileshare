import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getObjectStream } from "@/lib/s3/operations";
import archiver from "archiver";
import { Readable, PassThrough } from "node:stream";

const GRACE_PERIOD_HOURS = Number(process.env.GRACE_PERIOD_HOURS ?? 24);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const share = await db.query.shares.findFirst({
    where: eq(shares.id, id),
  });

  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  if (share.expiresAt < now) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  if (share.limitReachedAt) {
    const graceExpiry = share.limitReachedAt + GRACE_PERIOD_HOURS * 3600;
    if (now >= graceExpiry) {
      return NextResponse.json({ error: "Download limit reached" }, { status: 410 });
    }
  }

  if (
    share.maxDownloads !== null &&
    share.downloadCount >= share.maxDownloads
  ) {
    return NextResponse.json({ error: "Download limit reached" }, { status: 410 });
  }

  const files = await db.query.shareFiles.findMany({
    where: eq(shareFiles.shareId, id),
  });

  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 404 });
  }

  const newCount = share.downloadCount + 1;
  const limitJustReached =
    share.maxDownloads !== null && newCount >= share.maxDownloads;

  await db
    .update(shares)
    .set({
      downloadCount: sql`${shares.downloadCount} + 1`,
      ...(limitJustReached && !share.limitReachedAt
        ? { limitReachedAt: now }
        : {}),
    })
    .where(eq(shares.id, id));

  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 1 } });
  archive.pipe(passthrough);

  (async () => {
    for (const file of files) {
      const { stream } = await getObjectStream(file.s3Key);
      const nodeStream = Readable.fromWeb(stream as import("stream/web").ReadableStream);
      archive.append(nodeStream, { name: file.filename });
    }
    await archive.finalize();
  })();

  const webStream = Readable.toWeb(passthrough) as ReadableStream;

  const zipName = `${share.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
      "Transfer-Encoding": "chunked",
    },
  });
}
