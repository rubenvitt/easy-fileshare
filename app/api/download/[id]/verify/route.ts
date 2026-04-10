import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { password } = (await req.json()) as { password: string };

  const share = await db.query.shares.findFirst({
    where: eq(shares.id, id),
  });

  if (!share || !share.passwordHash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const valid = await verifyPassword(password, share.passwordHash);

  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
