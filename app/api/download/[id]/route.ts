import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getObjectStream } from "@/lib/s3/operations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const fileId = req.nextUrl.searchParams.get("file");

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

  if (
    share.maxDownloads !== null &&
    share.downloadCount >= share.maxDownloads
  ) {
    return NextResponse.json({ error: "Download limit reached" }, { status: 410 });
  }

  if (!fileId) {
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
  }

  const file = await db.query.shareFiles.findFirst({
    where: eq(shareFiles.id, fileId),
  });

  if (!file || file.shareId !== id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { stream, contentLength, contentType } = await getObjectStream(file.s3Key);

  await db
    .update(shares)
    .set({ downloadCount: sql`${shares.downloadCount} + 1` })
    .where(eq(shares.id, id));

  return new Response(stream as ReadableStream, {
    headers: {
      "Content-Type": contentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
    },
  });
}
