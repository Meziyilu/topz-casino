// app/api/bank/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDailyOutSum } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 驗證參數
const schema = z.object({
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = { id: "demo-user" }; // ⚠️ 這裡請換成你的驗證方式（目前無 JWT）

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    // 檢查每日流出上限
    const today = Number(await getDailyOutSum(auth.id)); // ✅ 強制轉 number
    const DAILY_MAX = Number(process.env.BANK_DAILY_OUT_MAX ?? 2_000_000);
    if (today + parsed.data.amount > DAILY_MAX) {
      return NextResponse.json({ ok: false, error: "DAILY_OUT_LIMIT" }, { status: 400 });
    }

    // 查餘額
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { bankBalance: true, balance: true },
    });
    if (!user || user.bankBalance < parsed.data.amount) {
      return NextResponse.json({ ok: false, error: "BANK_NOT_ENOUGH" }, { status: 400 });
    }

    // 執行提領
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.user.update({
        where: { id: auth.id },
        data: {
          bankBalance: { decrement: parsed.data.amount },
          balance: { increment: parsed.data.amount },
        },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: auth.id,
          type: "WITHDRAW",
          target: "BANK",
          amount: parsed.data.amount,
        },
      });

      return upd;
    });

    return NextResponse.json({ ok: true, balance: updated.balance, bankBalance: updated.bankBalance });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
