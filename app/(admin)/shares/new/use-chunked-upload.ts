"use client";

import { useState, useCallback } from "react";
import type { FileUploadState } from "./upload-progress";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

interface UploadInfo {
  fileId: string;
  s3Key: string;
  uploadId: string;
  filename: string;
}

interface UseChunkedUploadReturn {
  uploadStates: FileUploadState[];
  startUpload: (
    files: File[],
    metadata: {
      title: string;
      description?: string;
      expiryDays: number;
      maxDownloads?: number;
      password?: string;
    }
  ) => Promise<string | null>;
  isUploading: boolean;
}

export function useChunkedUpload(): UseChunkedUploadReturn {
  const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateState = useCallback(
    (fileId: string, update: Partial<FileUploadState>) => {
      setUploadStates((prev) =>
        prev.map((s) => (s.fileId === fileId ? { ...s, ...update } : s))
      );
    },
    []
  );

  const uploadFileChunks = useCallback(
    async (file: File, info: UploadInfo) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const parts: { etag: string; partNumber: number }[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const res = await fetch("/api/upload/chunk", {
          method: "POST",
          headers: {
            "x-s3-key": info.s3Key,
            "x-upload-id": info.uploadId,
            "x-part-number": String(i + 1),
          },
          body: chunk,
        });

        if (!res.ok) {
          throw new Error(`Chunk upload failed: ${res.statusText}`);
        }

        const { etag, partNumber } = await res.json();
        parts.push({ etag, partNumber });

        updateState(info.fileId, {
          progress: Math.round(((i + 1) / totalChunks) * 100),
        });
      }

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Key: info.s3Key,
          uploadId: info.uploadId,
          parts: parts.map((p) => ({
            ETag: p.etag,
            PartNumber: p.partNumber,
          })),
        }),
      });

      if (!completeRes.ok) {
        throw new Error(`Complete upload failed: ${completeRes.statusText}`);
      }
    },
    [updateState]
  );

  const startUpload = useCallback(
    async (
      files: File[],
      metadata: {
        title: string;
        description?: string;
        expiryDays: number;
        maxDownloads?: number;
        password?: string;
      }
    ): Promise<string | null> => {
      setIsUploading(true);

      try {
        const initRes = await fetch("/api/upload/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...metadata,
            files: files.map((f) => ({
              filename: f.name,
              size: f.size,
              mimeType: f.type || "application/octet-stream",
            })),
          }),
        });

        if (!initRes.ok) {
          const err = await initRes.json();
          throw new Error(err.error ?? "Init failed");
        }

        const { shareId, uploads } = (await initRes.json()) as {
          shareId: string;
          uploads: UploadInfo[];
        };

        setUploadStates(
          uploads.map((u) => ({
            fileId: u.fileId,
            filename: u.filename,
            progress: 0,
            status: "pending" as const,
          }))
        );

        for (let i = 0; i < uploads.length; i++) {
          const info = uploads[i];
          updateState(info.fileId, { status: "uploading" });

          try {
            await uploadFileChunks(files[i], info);
            updateState(info.fileId, { status: "complete", progress: 100 });
          } catch (err) {
            updateState(info.fileId, {
              status: "error",
              error: err instanceof Error ? err.message : "Upload fehlgeschlagen",
            });
            return null;
          }
        }

        return shareId;
      } catch (err) {
        console.error("Upload error:", err);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [updateState, uploadFileChunks]
  );

  return { uploadStates, startUpload, isUploading };
}
