"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export interface FileUploadState {
  fileId: string;
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

interface UploadProgressProps {
  uploads: FileUploadState[];
}

export function UploadProgress({ uploads }: UploadProgressProps) {
  if (uploads.length === 0) return null;

  return (
    <div className="border rounded-lg divide-y">
      {uploads.map((upload) => (
        <div
          key={upload.fileId}
          className="flex items-center gap-3 px-4 py-3 text-sm"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate">{upload.filename}</span>
            </div>
            {upload.status === "uploading" && (
              <Progress value={upload.progress} className="mt-1.5 h-1" />
            )}
            {upload.error && (
              <p className="text-xs text-destructive mt-1">{upload.error}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            {upload.status === "pending" && (
              <span className="text-xs text-muted-foreground">Warten...</span>
            )}
            {upload.status === "uploading" && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {upload.status === "complete" && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {upload.status === "error" && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
