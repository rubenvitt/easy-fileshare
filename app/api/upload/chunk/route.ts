import { NextRequest, NextResponse } from "next/server";
import { uploadPart } from "@/lib/s3/operations";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const s3Key = req.headers.get("x-s3-key");
  const uploadId = req.headers.get("x-upload-id");
  const partNumber = Number(req.headers.get("x-part-number"));

  if (!s3Key || !uploadId || !partNumber) {
    return NextResponse.json(
      { error: "Missing required headers: x-s3-key, x-upload-id, x-part-number" },
      { status: 400 }
    );
  }

  const body = await req.arrayBuffer();
  const part = await uploadPart(s3Key, uploadId, partNumber, Buffer.from(body));

  return NextResponse.json({ etag: part.ETag, partNumber: part.PartNumber });
}