export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

export async function GET() {
  const auth = await verifyRequest();
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, displayName: true, isAdmin: true, bankBalance: true, balance: true, emailVerifiedAt: true },
  });
  return NextResponse.json({ me });
}
