import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { debit, credit } from "@/services/wallet.service";
import { BalanceTarget, LedgerType } from "@prisma/client";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "NOT_AUTH" }, { status: 401 });

  const { room, kind, amount, payload } = await req.json();

  if (!Number.isInteger(amount) || amount <= 0)
    return NextResponse.json({ ok: false, error: "AMOUNT_INVALID" });

  // 扣款
  try {
    await debit(user.id, BalanceTarget.WALLET, amount, LedgerType.BET_PLACED);
    // 記錄下注
    await prisma.sicBoBet.create({
      data: {
        userId: user.id,
        roundId: "TODO", // 這裡要填當前回合ID，建議用 getOrRotateRound
        kind,
        amount,
        payload,
      },
    });

    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
    return NextResponse.json({ ok: true, wallet: u?.balance ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
