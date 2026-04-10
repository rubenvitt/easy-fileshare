"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes, formatRelativeTime, formatDate, isExpired } from "@/lib/format";
import { deleteShare, addDownloads } from "./actions";
import {
  Copy,
  ExternalLink,
  File,
  Folder,
  Lock,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

interface Share {
  id: string;
  title: string;
  description: string | null;
  type: "file" | "folder";
  passwordHash: string | null;
  expiresAt: number;
  maxDownloads: number | null;
  downloadCount: number;
  totalSize: number;
  createdAt: number;
  createdBy: string;
  s3Prefix: string;
  limitReachedAt: number | null;
  fileCount?: number;
  fileName?: string | null;
}

interface SharesTableProps {
  shares: Share[];
}

export function SharesTable({ shares }: SharesTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";

  function handleCopyLink(shareId: string) {
    const url = `${appUrl}/s/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleAddDownloads(shareId: string) {
    const amount = prompt("Wie viele Downloads hinzufügen?", "10");
    if (!amount) return;
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) return;
    startTransition(async () => {
      await addDownloads(shareId, num);
    });
  }

  function handleDelete(shareId: string) {
    setDeletingId(shareId);
    startTransition(async () => {
      try {
        await deleteShare(shareId);
      } catch {
        // Error handling could be improved with toast
      } finally {
        setDeletingId(null);
      }
    });
  }

  if (shares.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Noch keine Sharings vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Titel</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Läuft ab</TableHead>
            <TableHead>Downloads</TableHead>
            <TableHead>Schutz</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.map((share) => {
            const expired = isExpired(share.expiresAt);
            return (
              <TableRow key={share.id}>
                {/* Title + subtitle */}
                <TableCell>
                  <div>
                    <p className="font-medium leading-tight">{share.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {share.type === "file"
                        ? share.fileName ?? "1 Datei"
                        : `${share.fileCount ?? 0} Dateien`}
                      {" · "}
                      {formatBytes(share.totalSize)}
                    </p>
                  </div>
                </TableCell>

                {/* Type badge */}
                <TableCell>
                  {share.type === "file" ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                      <File className="mr-1 size-3" />
                      Datei
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                      <Folder className="mr-1 size-3" />
                      Ordner
                    </Badge>
                  )}
                </TableCell>

                {/* Expiry */}
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={<span />}
                        className={
                          expired
                            ? "text-destructive font-medium cursor-default"
                            : "text-foreground cursor-default"
                        }
                      >
                        {formatRelativeTime(share.expiresAt)}
                      </TooltipTrigger>
                      <TooltipContent>
                        {formatDate(share.expiresAt)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>

                {/* Downloads */}
                <TableCell>
                  <span className="tabular-nums">
                    {share.downloadCount}
                    {" / "}
                    {share.maxDownloads != null ? share.maxDownloads : "\u221E"}
                  </span>
                  {share.limitReachedAt && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Limit erreicht
                    </p>
                  )}
                </TableCell>

                {/* Password protection */}
                <TableCell>
                  {share.passwordHash ? (
                    <Badge
                      variant="secondary"
                      className="gap-1"
                    >
                      <Lock className="size-3" />
                      Passwort
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Aktionen</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleCopyLink(share.id)}
                      >
                        <Copy className="size-4" />
                        {copiedId === share.id
                          ? "Link kopiert!"
                          : "Link kopieren"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(`/s/${share.id}`, "_blank")
                        }
                      >
                        <ExternalLink className="size-4" />
                        Sharing öffnen
                      </DropdownMenuItem>
                      {share.maxDownloads != null && (
                        <DropdownMenuItem
                          onClick={() => handleAddDownloads(share.id)}
                        >
                          <Plus className="size-4" />
                          Downloads nachbuchen
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={deletingId === share.id && isPending}
                        onClick={() => handleDelete(share.id)}
                      >
                        <Trash2 className="size-4" />
                        {deletingId === share.id && isPending
                          ? "Wird gelöscht..."
                          : "Löschen"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
