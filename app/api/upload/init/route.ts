import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { initMultipartUpload } from "@/lib/s3/operations";
import { auth } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    expiryDays,
    maxDownloads,
    password,
    files,
  } = body as {
    title: string;
    description?: string;
    expiryDays: number;
    maxDownloads?: number;
    password?: string;
    files: { filename: string; size: number; mimeType: string }[];
  };

  const maxExpiryDays = Number(process.env.MAX_EXPIRY_DAYS ?? 7);
  const days = Math.min(Math.max(1, expiryDays), maxExpiryDays);
  const expiresAt = Math.floor(Date.now() / 1000) + days * 86400;

  const shareId = nanoid(10);
  const s3Prefix = `shares/${shareId}/`;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const maxFileSize = Number(process.env.MAX_FILE_SIZE ?? 524288000);
  for (const file of files) {
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File ${file.filename} exceeds max size` },
        { status: 400 }
      );
    }
  }

  const passwordHash = password ? await hashPassword(password) : null;

  await db.insert(shares).values({
    id: shareId,
    title,
    description: description || null,
    type: files.length === 1 ? "file" : "folder",
    passwordHash,
    expiresAt,
    maxDownloads: maxDownloads || null,
    totalSize,
    createdBy: session.user.email ?? "unknown",
    s3Prefix,
  });

  const uploadInfos = await Promise.all(
    files.map(async (file) => {
      const fileId = nanoid(10);
      const s3Key = `${s3Prefix}${fileId}/${file.filename}`;

      await db.insert(shareFiles).values({
        id: fileId,
        shareId,
        filename: file.filename,
        s3Key,
        size: file.size,
        mimeType: file.mimeType,
      });

      const uploadId = await initMultipartUpload(s3Key);

      return {
        fileId,
        s3Key,
        uploadId,
        filename: file.filename,
      };
    })
  );

  return NextResponse.json({
    shareId,
    uploads: uploadInfos,
  });
}
