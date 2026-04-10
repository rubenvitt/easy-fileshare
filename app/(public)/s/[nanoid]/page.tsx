import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PasswordGate } from "./password-gate";
import { FileView } from "./file-view";
import { FolderView } from "./folder-view";
import { LuClock, LuBan } from "react-icons/lu";

interface PageProps {
  params: Promise<{ nanoid: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { nanoid } = await params;

  const share = await db.query.shares.findFirst({
    where: eq(shares.id, nanoid),
  });

  if (!share) notFound();

  const now = Math.floor(Date.now() / 1000);

  if (share.expiresAt < now) {
    return <ExpiredView />;
  }

  if (
    share.maxDownloads !== null &&
    share.downloadCount >= share.maxDownloads
  ) {
    return <LimitReachedView />;
  }

  const files = await db.query.shareFiles.findMany({
    where: eq(shareFiles.shareId, share.id),
  });

  if (share.passwordHash) {
    return (
      <PasswordGate shareId={share.id}>
        {share.type === "file" ? (
          <FileView share={share} file={files[0]} />
        ) : (
          <FolderView share={share} files={files} />
        )}
      </PasswordGate>
    );
  }

  return share.type === "file" ? (
    <FileView share={share} file={files[0]} />
  ) : (
    <FolderView share={share} files={files} />
  );
}

function ExpiredView() {
  return (
    <div className="text-center py-20">
      <LuClock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h1 className="text-xl font-semibold mb-2">Sharing abgelaufen</h1>
      <p className="text-muted-foreground">
        Dieses Sharing ist nicht mehr verfügbar.
      </p>
    </div>
  );
}

function LimitReachedView() {
  return (
    <div className="text-center py-20">
      <LuBan className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h1 className="text-xl font-semibold mb-2">Download-Limit erreicht</h1>
      <p className="text-muted-foreground">
        Die maximale Anzahl an Downloads wurde erreicht.
      </p>
    </div>
  );
}
