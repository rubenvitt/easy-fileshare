"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { LuFolderUp, LuFile, LuX } from "react-icons/lu";

interface UploadFile {
  file: File;
  id: string;
}

interface UploadZoneProps {
  files: UploadFile[];
  onFilesChange: (files: UploadFile[]) => void;
  maxFileSize: number;
}

export function UploadZone({ files, onFilesChange, maxFileSize }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const additions: UploadFile[] = [];
      for (const file of Array.from(newFiles)) {
        if (file.size > maxFileSize) continue;
        additions.push({ file, id: crypto.randomUUID() });
      }
      onFilesChange([...files, ...additions]);
    },
    [files, onFilesChange, maxFileSize]
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange(files.filter((f) => f.id !== id));
    },
    [files, onFilesChange]
  );

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.onchange = () => {
            if (input.files) addFiles(input.files);
          };
          input.click();
        }}
      >
        <LuFolderUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <div className="font-medium">Dateien hierher ziehen</div>
        <div className="text-sm text-muted-foreground">
          oder klicken zum Auswählen · max.{" "}
          {Math.round(maxFileSize / 1024 / 1024)} MB pro Datei
        </div>
      </div>

      {files.length > 0 && (
        <div className="border rounded-lg divide-y">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <LuFile className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{f.file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatSize(f.file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                className="text-muted-foreground hover:text-destructive ml-2"
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
