import { buttonVariants } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FilePreview } from "@/components/file-preview";
import type { shares, shareFiles } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Share = InferSelectModel<typeof shares>;
type ShareFile = InferSelectModel<typeof shareFiles>;

interface FileViewProps {
  share: Share;
  file: ShareFile;
}

export function FileView({ share, file }: FileViewProps) {
  const appName = process.env.APP_NAME ?? "EasyShare";
  const expiresDate = new Date(share.expiresAt * 1000);

  return (
    <div className="text-center py-12 max-w-md mx-auto">
      <div className="text-sm text-muted-foreground tracking-widest uppercase mb-8">
        {appName}
      </div>

      <FileIcon mimeType={file.mimeType} />

      <h1 className="text-xl font-semibold mt-5 mb-1">{share.title}</h1>
      <p className="text-sm text-muted-foreground mb-1">
        {file.filename} · {formatBytes(file.size)}
      </p>

      {share.description && (
        <div className="border rounded-lg px-4 py-3 text-sm text-muted-foreground text-left mt-6 mb-6">
          {share.description}
        </div>
      )}

      <FilePreview
        shareId={share.id}
        fileId={file.id}
        mimeType={file.mimeType}
        filename={file.filename}
      />

      <a
        href={`/api/download/${share.id}?file=${file.id}`}
        className={cn(buttonVariants({ size: "lg" }), "w-full mt-6")}
      >
        <Download className="mr-2 h-4 w-4" />
        Herunterladen
      </a>

      <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-4">
        <span>
          Läuft ab: {expiresDate.toLocaleDateString("de-DE")}
        </span>
        <span>·</span>
        <span>{share.downloadCount} Downloads</span>
      </div>
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const ext = mimeType.split("/")[1]?.toUpperCase() ?? "FILE";
  return (
    <div className="w-16 h-20 mx-auto border-2 rounded-lg flex items-center justify-center text-xs font-semibold text-muted-foreground">
      {ext.substring(0, 4)}
    </div>
  );
}
