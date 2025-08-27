import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const adminId = String(payload.sub);
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { isAdmin:true }});
    if (!admin?.isAdmin) return NextResponse.json({ error: "沒有權限" }, { status: 403 });

    const { userId, target, amount, memo } = await req.json() as {
      userId: string; target: "WALLET"|"BANK"; amount: number; memo?: string;
    };
    const delta = Number(amount);
    if (!userId || (target!=="WALLET" && target!=="BANK") || !Number.isInteger(delta) || delta===0) {
      return NextResponse.json({ error: "參數不合法" }, { status: 400 });
    }

    // 以交易為單位的原子更新
    const res = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId } });
      if (!u) throw new Error("找不到使用者");

      let newWallet = u.balance;
      let newBank   = u.bankBalance;

      if (target === "WALLET") {
        newWallet = u.balance + delta;
        if (newWallet < 0) throw new Error("錢包不足");
        await tx.user.update({ where: { id: userId }, data: { balance: newWallet } });
      } else {
        newBank = u.bankBalance + delta;
        if (newBank < 0) throw new Error("銀行不足");
        await tx.user.update({ where: { id: userId }, data: { bankBalance: newBank } });
      }

      await tx.ledger.create({
        data: {
          userId, adminId,
          type: "ADMIN_ADJUST",
          target,
          delta,
          memo: memo?.slice(0, 200) || null,
          balanceAfter: newWallet,
          bankAfter: newBank
        }
      });

      return { wallet: newWallet, bank: newBank };
    });

    return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 400 });
  }
}
