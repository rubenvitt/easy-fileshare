import { Card, CardContent } from "@/components/ui/card";
import { formatBytes } from "@/lib/format";
import { ArrowDownToLine, HardDrive, Share2 } from "lucide-react";

interface StatsCardsProps {
  activeCount: number;
  expiringToday: number;
  totalDownloads: number;
  downloadsToday: number;
  totalSize: number;
  maxSize?: number;
}

export function StatsCards({
  activeCount,
  expiringToday,
  totalDownloads,
  downloadsToday,
  totalSize,
  maxSize,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Active Shares */}
      <Card className="relative overflow-hidden border-blue-200/50 dark:border-blue-900/50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-950/30 dark:to-blue-900/10" />
        <CardContent className="relative pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Aktive Sharings
              </p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {activeCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {expiringToday > 0
                  ? `${expiringToday} ${expiringToday === 1 ? "läuft" : "laufen"} heute ab`
                  : "Keine laufen heute ab"}
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/40">
              <Share2 className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Downloads */}
      <Card className="relative overflow-hidden border-green-200/50 dark:border-green-900/50">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 to-green-100/40 dark:from-green-950/30 dark:to-green-900/10" />
        <CardContent className="relative pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Downloads gesamt
              </p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {totalDownloads}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {downloadsToday > 0
                  ? `${downloadsToday} heute`
                  : "Keine heute"}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/40">
              <ArrowDownToLine className="size-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card className="relative overflow-hidden border-purple-200/50 dark:border-purple-900/50">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-purple-100/40 dark:from-purple-950/30 dark:to-purple-900/10" />
        <CardContent className="relative pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Speicher belegt
              </p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {formatBytes(totalSize)}
              </p>
              {maxSize ? (
                <p className="text-xs text-muted-foreground mt-1">
                  von {formatBytes(maxSize)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Kein Limit
                </p>
              )}
            </div>
            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/40">
              <HardDrive className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
