import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { downloadLogs, shareFiles } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const logs = await db
    .select()
    .from(downloadLogs)
    .where(eq(downloadLogs.shareId, id))
    .orderBy(desc(downloadLogs.downloadedAt))
    .limit(100);

  // Join filenames
  const fileIds = [...new Set(logs.filter((l) => l.fileId).map((l) => l.fileId!))];
  const files =
    fileIds.length > 0
      ? await db
          .select({ id: shareFiles.id, filename: shareFiles.filename })
          .from(shareFiles)
          .where(inArray(shareFiles.id, fileIds))
      : [];
  const fileMap = new Map(files.map((f) => [f.id, f.filename]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    filename: log.fileId ? fileMap.get(log.fileId) ?? null : "ZIP",
  }));

  return NextResponse.json(enrichedLogs);
}
