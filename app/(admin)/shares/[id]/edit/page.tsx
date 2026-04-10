import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditForm } from "./edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSharePage({ params }: PageProps) {
  const { id } = await params;

  const share = await db.query.shares.findFirst({
    where: eq(shares.id, id),
  });

  if (!share) {
    notFound();
  }

  const maxExpiryDays = Number(process.env.MAX_EXPIRY_DAYS ?? "7");

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Sharing bearbeiten</h1>
      <EditForm
        share={{
          id: share.id,
          title: share.title,
          description: share.description,
          expiresAt: share.expiresAt,
          maxDownloads: share.maxDownloads,
          hasPassword: !!share.passwordHash,
        }}
        maxExpiryDays={maxExpiryDays}
      />
    </div>
  );
}
