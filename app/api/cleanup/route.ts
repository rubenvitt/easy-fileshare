import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { lt, eq, and, isNotNull, or } from "drizzle-orm";
import { deletePrefix } from "@/lib/s3/operations";

const GRACE_PERIOD_HOURS = Number(process.env.GRACE_PERIOD_HOURS ?? 24);

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.CLEANUP_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const graceThreshold = now - GRACE_PERIOD_HOURS * 3600;

  // Find shares that are: expired OR grace period exceeded
  const staleShares = await db
    .select({ id: shares.id, s3Prefix: shares.s3Prefix })
    .from(shares)
    .where(
      or(
        lt(shares.expiresAt, now),
        and(isNotNull(shares.limitReachedAt), lt(shares.limitReachedAt, graceThreshold))
      )
    );

  let deleted = 0;

  for (const share of staleShares) {
    await deletePrefix(share.s3Prefix);
    await db.delete(shareFiles).where(eq(shareFiles.shareId, share.id));
    await db.delete(shares).where(eq(shares.id, share.id));
    deleted++;
  }

  return NextResponse.json({ deleted });
}
