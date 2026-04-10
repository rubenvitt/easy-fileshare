import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shares, shareFiles } from "@/lib/db/schema";
import { lt, eq } from "drizzle-orm";
import { deletePrefix } from "@/lib/s3/operations";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.CLEANUP_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);

  const expiredShares = await db
    .select({ id: shares.id, s3Prefix: shares.s3Prefix })
    .from(shares)
    .where(lt(shares.expiresAt, now));

  let deleted = 0;

  for (const share of expiredShares) {
    await deletePrefix(share.s3Prefix);
    await db.delete(shareFiles).where(eq(shareFiles.shareId, share.id));
    await db.delete(shares).where(eq(shares.id, share.id));
    deleted++;
  }

  return NextResponse.json({ deleted, total: expiredShares.length });
}
