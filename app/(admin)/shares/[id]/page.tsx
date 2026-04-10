import { db } from "@/lib/db";
import { shares, shareFiles, downloadLogs } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import {
  formatBytes,
  formatDate,
  formatRelativeTime,
  isExpired,
} from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShareDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch share
  const share = await db
    .select()
    .from(shares)
    .where(eq(shares.id, id))
    .then((r) => r[0]);

  if (!share) {
    notFound();
  }

  // Fetch files for this share
  const files = await db
    .select()
    .from(shareFiles)
    .where(eq(shareFiles.shareId, id));

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Fetch download logs
  const logs = await db
    .select()
    .from(downloadLogs)
    .where(eq(downloadLogs.shareId, id))
    .orderBy(desc(downloadLogs.downloadedAt))
    .limit(100);

  // Join filenames for logs
  const fileIds = [
    ...new Set(logs.filter((l) => l.fileId).map((l) => l.fileId!)),
  ];
  const logFiles =
    fileIds.length > 0
      ? await db
          .select({ id: shareFiles.id, filename: shareFiles.filename })
          .from(shareFiles)
          .where(inArray(shareFiles.id, fileIds))
      : [];
  const fileMap = new Map(logFiles.map((f) => [f.id, f.filename]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    filename: log.fileId ? fileMap.get(log.fileId) ?? null : "ZIP",
  }));

  const expired = isExpired(share.expiresAt);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/dashboard" />}>
          <ArrowLeft className="size-4" />
          <span className="sr-only">Zurueck zum Dashboard</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{share.title}</h1>
          {share.description && (
            <p className="text-muted-foreground mt-1">{share.description}</p>
          )}
        </div>
        <Button variant="outline" render={<Link href={`/shares/${id}/edit`} />}>
          Bearbeiten
        </Button>
      </div>

      {/* Share Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sharing-Details</CardTitle>
          <CardDescription>
            Erstellt am {formatDate(share.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Typ</p>
              <p className="font-medium">
                {share.type === "file" ? "Datei" : "Ordner"} ({files.length}{" "}
                {files.length === 1 ? "Datei" : "Dateien"})
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ablauf</p>
              <p className={`font-medium ${expired ? "text-destructive" : ""}`}>
                {formatRelativeTime(share.expiresAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(share.expiresAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Downloads</p>
              <p className="font-medium tabular-nums">
                {share.downloadCount}
                {" / "}
                {share.maxDownloads != null ? share.maxDownloads : "\u221E"}
              </p>
              {share.limitReachedAt && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Limit erreicht
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Groesse</p>
              <p className="font-medium">{formatBytes(totalSize)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passwortschutz</p>
              <p className="font-medium">
                {share.passwordHash ? (
                  <Badge variant="secondary">Aktiv</Badge>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Erstellt von</p>
              <p className="font-medium">{share.createdBy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Logs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Download-Protokoll ({enrichedLogs.length})
        </h2>
        {enrichedLogs.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Noch keine Downloads vorhanden.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Datei</TableHead>
                  <TableHead>IP-Adresse</TableHead>
                  <TableHead className="hidden md:table-cell">
                    User-Agent
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(log.downloadedAt)}
                    </TableCell>
                    <TableCell>
                      {log.filename ?? (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ip ?? (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px] truncate text-xs text-muted-foreground">
                      {log.userAgent ?? "&mdash;"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
