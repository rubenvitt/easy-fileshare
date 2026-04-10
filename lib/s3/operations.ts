import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "./index";

export async function initMultipartUpload(key: string) {
  const { UploadId } = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: S3_BUCKET, Key: key })
  );
  return UploadId!;
}

export async function uploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer | Uint8Array
) {
  const { ETag } = await s3.send(
    new UploadPartCommand({
      Bucket: S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
    })
  );
  return { ETag: ETag!, PartNumber: partNumber } satisfies CompletedPart;
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedPart[]
) {
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  );
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: S3_BUCKET,
      Key: key,
      UploadId: uploadId,
    })
  );
}

export async function getObjectStream(key: string) {
  const { Body, ContentLength, ContentType } = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  return {
    stream: Body!.transformToWebStream(),
    contentLength: ContentLength,
    contentType: ContentType,
  };
}

export async function deletePrefix(prefix: string) {
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix })
  );
  if (!listed.Contents?.length) return;

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: S3_BUCKET,
      Delete: {
        Objects: listed.Contents.map((o) => ({ Key: o.Key })),
      },
    })
  );
}
