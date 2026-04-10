import { buttonVariants } from "@/components/ui/button";
import { Download, FolderOpen } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { shares, shareFiles } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Share = InferSelectModel<typeof shares>;
type ShareFile = InferSelectModel<typeof shareFiles>;

interface FolderViewProps {
  share: Share;
  files: ShareFile[];
}

export function FolderView({ share, files }: FolderViewProps) {
  const appName = process.env.APP_NAME ?? "EasyShare";
  const expiresDate = new Date(share.expiresAt * 1000);

  return (
    <div className="py-12 max-w-md mx-auto">
      <div className="text-sm text-muted-foreground tracking-widest uppercase mb-8 text-center">
        {appName}
      </div>

      <div className="text-center mb-6">
        <FolderOpen className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-semibold mb-1">{share.title}</h1>
        <p className="text-sm text-muted-foreground">
          {files.length} Dateien · {formatBytes(share.totalSize)} gesamt
        </p>
      </div>

      {share.description && (
        <div className="border rounded-lg px-4 py-3 text-sm text-muted-foreground mb-6">
          {share.description}
        </div>
      )}

      <div className="border rounded-lg divide-y mb-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground">📄</span>
              <span className="truncate">{file.filename}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatBytes(file.size)}
              </span>
            </div>
            <a
              href={`/api/download/${share.id}?file=${file.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>

      <a
        href={`/api/download/${share.id}/zip`}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        <Download className="mr-2 h-4 w-4" />
        Alle herunterladen (ZIP)
      </a>

      <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-4">
        <span>Läuft ab: {expiresDate.toLocaleDateString("de-DE")}</span>
        <span>·</span>
        <span>{share.downloadCount} Downloads</span>
      </div>
    </div>
  );
}
