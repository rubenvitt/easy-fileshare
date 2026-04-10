"use server";

import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { deletePrefix } from "@/lib/s3/operations";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
