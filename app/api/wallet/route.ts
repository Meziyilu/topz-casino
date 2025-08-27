import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { balance: true, bankBalance: true }
    });
    if (!me) return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    return NextResponse.json({ wallet: me.balance, bank: me.bankBalance });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const userId = String(payload.sub);

    const { action, amount } = await req.json();
    const amt = Number(amount);
    if (!["deposit", "withdraw"].includes(action)) {
      return NextResponse.json({ error: "不支援的動作" }, { status: 400 });
    }
    if (!Number.isInteger(amt) || amt <= 0) {
      return NextResponse.json({ error: "金額不合法" }, { status: 400 });
    }

    // deposit: 銀行 -> 錢包； withdraw: 錢包 -> 銀行
    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me) return NextResponse.json({ error: "找不到使用者" }, { status: 404 });

    if (action === "deposit") {
      if (me.bankBalance < amt) return NextResponse.json({ error: "銀行餘額不足" }, { status: 400 });
      const u = await prisma.user.update({
        where: { id: userId },
        data: { bankBalance: { decrement: amt }, balance: { increment: amt } },
        select: { balance: true, bankBalance: true }
      });
      return NextResponse.json({ wallet: u.balance, bank: u.bankBalance });
    } else {
      if (me.balance < amt) return NextResponse.json({ error: "錢包餘額不足" }, { status: 400 });
      const u = await prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: amt }, bankBalance: { increment: amt } },
        select: { balance: true, bankBalance: true }
      });
      return NextResponse.json({ wallet: u.balance, bank: u.bankBalance });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
