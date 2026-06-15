import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { shares, shareFiles, downloadLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getObjectStream } from "@/lib/s3/operations";
import { nanoid } from "nanoid";
import * as archiverModule from "archiver";
import { Readable, PassThrough } from "node:stream";

const GRACE_PERIOD_HOURS = Number(process.env.GRACE_PERIOD_HOURS ?? 24);
const { ZipArchive } = archiverModule as unknown as {
  ZipArchive: new (options?: archiverModule.ArchiverOptions) => archiverModule.Archiver;
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

  // Zähler/Log laufen NACH der Response (after), nicht im kritischen Pfad.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;
  after(() => {
    try {
      const newCount = share.downloadCount + 1;
      const limitJustReached =
        share.maxDownloads !== null && newCount >= share.maxDownloads;
      db.update(shares)
        .set({
          downloadCount: sql`${shares.downloadCount} + 1`,
          ...(limitJustReached && !share.limitReachedAt
            ? { limitReachedAt: now }
            : {}),
        })
        .where(eq(shares.id, id))
        .run();
      db.insert(downloadLogs)
        .values({ id: nanoid(10), shareId: id, fileId: null, ip, userAgent })
        .run();
    } catch (e) {
      console.error("[zip] failed to record download:", e);
    }
  });

  const passthrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 1 } });

  // Ohne Fehler-Handler hängt bei einem fehlgeschlagenen S3-Fetch der
  // PassThrough für immer -> Client wartet bis zum 524-Timeout.
  archive.on("error", (err) => {
    console.error("[zip] archive error:", err);
    passthrough.destroy(err);
  });
  archive.pipe(passthrough);

  // Client-Abbruch -> Archiv und Streams sofort aufräumen, Sockets freigeben.
  const onAbort = () => {
    archive.abort();
    passthrough.destroy();
  };
  req.signal.addEventListener("abort", onAbort);

  (async () => {
    try {
      for (const file of files) {
        if (req.signal.aborted) break;
        const { stream } = await getObjectStream(file.s3Key, req.signal);
        const nodeStream = Readable.fromWeb(
          stream as import("stream/web").ReadableStream
        );
        archive.append(nodeStream, { name: file.filename });
      }
      await archive.finalize();
    } catch (err) {
      console.error("[zip] failed to build archive:", err);
      passthrough.destroy(err as Error);
    } finally {
      req.signal.removeEventListener("abort", onAbort);
    }
  })();

  const webStream = Readable.toWeb(passthrough) as ReadableStream;

  const zipName = `${share.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
    },
  });
}
