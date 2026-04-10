import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { isExpired } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatsCards } from "./stats-cards";
import { SharesTable } from "./shares-table";

export default async function DashboardPage() {
  // Fetch all shares ordered by most recent first
  const allShares = await db
    .select()
    .from(shares)
    .orderBy(desc(shares.createdAt));

  // Fetch file counts and first filename per share for display
  const fileCounts = await db
    .select({
      shareId: shareFiles.shareId,
      count: sql<number>`count(*)`.as("count"),
      fileName: sql<string | null>`min(${shareFiles.filename})`.as("fileName"),
    })
    .from(shareFiles)
    .groupBy(shareFiles.shareId);

  const fileCountMap = new Map(
    fileCounts.map((fc) => [
      fc.shareId,
      { count: fc.count, fileName: fc.fileName },
    ])
  );

  // Calculate statistics
  const now = Math.floor(Date.now() / 1000);
  const startOfDay = now - (now % 86400);
  const endOfDay = startOfDay + 86400;

  const activeCount = allShares.filter((s) => !isExpired(s.expiresAt)).length;
  const expiringToday = allShares.filter(
    (s) => s.expiresAt >= startOfDay && s.expiresAt < endOfDay
  ).length;
  const totalDownloads = allShares.reduce(
    (sum, s) => sum + s.downloadCount,
    0
  );
  // We approximate "downloads today" — in production you'd track this separately
  const downloadsToday = 0;
  const totalSize = allShares.reduce((sum, s) => sum + s.totalSize, 0);

  // Enrich shares with file info
  const enrichedShares = allShares.map((share) => {
    const fileInfo = fileCountMap.get(share.id);
    return {
      ...share,
      fileCount: fileInfo?.count ?? 0,
      fileName: fileInfo?.fileName ?? null,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Übersicht aller Sharings und Statistiken
          </p>
        </div>
        <Button render={<Link href="/shares/new" />}>
          <Plus className="size-4" data-icon="inline-start" />
          Neues Sharing
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards
        activeCount={activeCount}
        expiringToday={expiringToday}
        totalDownloads={totalDownloads}
        downloadsToday={downloadsToday}
        totalSize={totalSize}
      />

      {/* Shares Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Alle Sharings</h2>
        <SharesTable shares={enrichedShares} />
      </div>
    </div>
  );
}
