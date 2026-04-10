"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface FilePreviewProps {
  shareId: string;
  fileId: string;
  mimeType: string;
  filename: string;
}

const MAX_TEXT_SIZE = 100 * 1024; // 100 KB

export function FilePreview({
  shareId,
  fileId,
  mimeType,
  filename,
}: FilePreviewProps) {
  const previewUrl = `/api/preview/${shareId}?file=${fileId}`;

  if (mimeType.startsWith("image/")) {
    return (
      <div className="mt-6 mb-6">
        <div className="border rounded-lg overflow-hidden">
          <img
            src={previewUrl}
            alt={filename}
            className="w-full max-h-[500px] object-contain"
          />
        </div>
      </div>
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <div className="mt-6 mb-6">
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={previewUrl}
            title={filename}
            className="w-full min-h-[500px]"
          />
        </div>
      </div>
    );
  }

  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return <TextPreview url={previewUrl} filename={filename} />;
  }

  return null;
}

function TextPreview({ url, filename }: { url: string; filename: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchText() {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          setError("Vorschau konnte nicht geladen werden");
          setLoading(false);
          return;
        }

        const contentLength = res.headers.get("Content-Length");
        if (contentLength && parseInt(contentLength, 10) > MAX_TEXT_SIZE) {
          // Read only first 100KB
          const reader = res.body?.getReader();
          if (!reader) {
            setError("Vorschau konnte nicht geladen werden");
            setLoading(false);
            return;
          }

          const decoder = new TextDecoder();
          let text = "";
          let totalBytes = 0;

          while (totalBytes < MAX_TEXT_SIZE) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            text += decoder.decode(value, { stream: true });
          }

          reader.cancel();

          if (!cancelled) {
            setContent(text.slice(0, MAX_TEXT_SIZE));
            setTruncated(true);
            setLoading(false);
          }
        } else {
          const text = await res.text();
          if (!cancelled) {
            setContent(text);
            setLoading(false);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Vorschau konnte nicht geladen werden");
          setLoading(false);
        }
      }
    }

    fetchText();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-6 mb-6 border rounded-lg p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 mb-6 border rounded-lg p-4 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-6 mb-6">
      <div className="border rounded-lg overflow-hidden">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words max-h-[500px] overflow-auto text-left">
          {content}
        </pre>
        {truncated && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Vorschau auf 100 KB begrenzt. Datei herunterladen, um den gesamten
            Inhalt zu sehen.
          </div>
        )}
      </div>
    </div>
  );
}
