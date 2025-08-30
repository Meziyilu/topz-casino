// app/api/admin/wallet/adjust/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export async function POST(req: Request) {
  const user = await verifyJWT(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, delta, reason } = await req.json();
  if (!userId || !delta) return NextResponse.json({ error: "缺少參數" }, { status: 400 });

  const u = await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: Number(delta) } },
  });

  await prisma.ledger.create({
    data: {
      userId,
      type: delta > 0 ? "ADMIN_ADD" : "ADMIN_DEDUCT",
      amount: delta,
      note: reason || "",
    },
  });

  return NextResponse.json({ user: u });
}
