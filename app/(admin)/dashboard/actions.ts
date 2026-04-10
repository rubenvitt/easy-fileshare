"use server";

import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { deletePrefix } from "@/lib/s3/operations";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addDownloads(id: string, amount: number) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, id),
  });

  if (!share) throw new Error("Sharing nicht gefunden");

  await db
    .update(shares)
    .set({
      maxDownloads: share.maxDownloads
        ? sql`${shares.maxDownloads} + ${amount}`
        : amount,
      limitReachedAt: null,
    })
    .where(eq(shares.id, id));

  revalidatePath("/dashboard");
}

export async function updateShare(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    expiryDays?: number;
    maxDownloads?: number | null;
    password?: string | null;
  }
) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, id),
  });

  if (!share) throw new Error("Sharing nicht gefunden");

  const updates: Record<string, unknown> = {};

  if (data.title !== undefined) {
    if (!data.title.trim()) throw new Error("Titel darf nicht leer sein");
    updates.title = data.title.trim();
  }

  if (data.description !== undefined) {
    updates.description = data.description;
  }

  if (data.expiryDays !== undefined) {
    updates.expiresAt = Math.floor(Date.now() / 1000) + data.expiryDays * 86400;
  }

  if (data.maxDownloads !== undefined) {
    updates.maxDownloads = data.maxDownloads;
    if (data.maxDownloads === null) {
      updates.limitReachedAt = null;
    }
  }

  if (data.password === null) {
    updates.passwordHash = null;
  } else if (typeof data.password === "string") {
    updates.passwordHash = await hashPassword(data.password);
  }

  if (Object.keys(updates).length > 0) {
    await db.update(shares).set(updates).where(eq(shares.id, id));
  }

  revalidatePath("/dashboard");
}

export async function deleteShare(id: string) {
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, id),
  });

  if (!share) {
    throw new Error("Sharing nicht gefunden");
  }

  // Delete files from S3
  await deletePrefix(share.s3Prefix);

  // Delete share from database (cascade deletes share_files)
  await db.delete(shares).where(eq(shares.id, id));

  revalidatePath("/dashboard");
}
