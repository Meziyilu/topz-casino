// app/api/wallet/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { Prisma } from "@prisma/client"; // ✅ 引入 TransactionClient 型別

export const runtime = "nodejs";

// 取得使用者錢包 & 銀行餘額
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { balance: true, bankBalance: true },
    });
    if (!me) return NextResponse.json({ error: "找不到使用者" }, { status: 404 });

    const res = NextResponse.json({ wallet: me.balance, bank: me.bankBalance });
    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// 錢包與銀行轉帳
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const payload = await verifyJWT(token);
    const userId = String(payload.sub);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || ""); // deposit | withdraw
    const amount = Number(body?.amount);

    if (!["deposit", "withdraw"].includes(action)) {
      return NextResponse.json({ error: "不支援的動作" }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "金額不合法" }, { status: 400 });
    }

    const out = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const u = await tx.user.findUnique({ where: { id: userId } });
      if (!u) throw new Error("找不到使用者");

      let wallet = u.balance;
      let bank = u.bankBalance;

      if (action === "deposit") {
        if (bank < amount) throw new Error("銀行餘額不足");
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            bankBalance: { decrement: amount },
            balance: { increment: amount },
          },
          select: { balance: true, bankBalance: true },
        });
        wallet = updated.balance;
        bank = updated.bankBalance;

        await tx.ledger.create({
          data: {
            userId,
            type: "TRANSFER_IN",
            target: "WALLET",
            delta: amount,
            memo: "銀行 → 錢包",
            balanceAfter: wallet,
            bankAfter: bank,
          },
        });
      } else {
        if (wallet < amount) throw new Error("錢包餘額不足");
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            balance: { decrement: amount },
            bankBalance: { increment: amount },
          },
          select: { balance: true, bankBalance: true },
        });
        wallet = updated.balance;
        bank = updated.bankBalance;

        await tx.ledger.create({
          data: {
            userId,
            type: "TRANSFER_OUT",
            target: "BANK",
            delta: -amount,
            memo: "錢包 → 銀行",
            balanceAfter: wallet,
            bankAfter: bank,
          },
        });
      }

      return { wallet, bank };
    });

    const res = NextResponse.json(out);
    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    return res;
  } catch (e: any) {
    const msg = e?.message || "Server error";
    const status = /不足|不合法|未登入|不支援/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
