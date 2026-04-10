import { NextRequest, NextResponse } from "next/server";
import { completeMultipartUpload } from "@/lib/s3/operations";
import { auth } from "@/lib/auth";
import type { CompletedPart } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { s3Key, uploadId, parts } = (await req.json()) as {
    s3Key: string;
    uploadId: string;
    parts: CompletedPart[];
  };

  if (!s3Key || !uploadId || !parts?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  await completeMultipartUpload(s3Key, uploadId, parts);

  return NextResponse.json({ ok: true });
}
