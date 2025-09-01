export const runtime = "nodejs";
// app/api/bank/transfer/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";
import { getUserBalances, isValidAmount, readIdempotencyKey } from "@/lib/bank";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const token = await verifyJWTFromRequest(req);
    if (!token) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

    const body = await req.json();
    const toUserId = body?.toUserId as string;
    const amount = body?.amount;
    const note = body?.note ?? null;
    const feePct: number | undefined = body?.feePct;
    const feeSide: "SENDER" | "RECEIVER" | "NONE" = body?.feeSide ?? "NONE";
    const idem = body?.idempotencyKey || readIdempotencyKey(req);

    if (!toUserId) return NextResponse.json({ ok: false, error: "TO_REQUIRED" }, { status: 400 });
    if (!isValidAmount(amount)) return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
    if (toUserId === token.userId) return NextResponse.json({ ok: false, error: "SELF_TRANSFER_NOT_ALLOWED" }, { status: 400 });

    if (idem) {
      const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
      if (existed) {
        const sender = await prisma.user.findUnique({ where: { id: existed.userId }, select: { balance: true, bankBalance: true } });
        const receiver = await prisma.user.findUnique({ where: { id: existed.peerUserId || toUserId }, select: { balance: true, bankBalance: true } });
        return NextResponse.json({ ok: true, data: { sender, receiver }, reused: true });
      }
    }

    const senderId = token.userId;
    const receiver = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!receiver) return NextResponse.json({ ok: false, error: "RECEIVER_NOT_FOUND" }, { status: 404 });

    const groupId = randomUUID();
    const fee = feePct && feePct > 0 ? Math.floor(amount * feePct) : 0;

    const result = await prisma.$transaction(async (tx) => {
      const s = await tx.user.findUnique({ where: { id: senderId }, select: { balance: true, bankBalance: true } });
      const r = await tx.user.findUnique({ where: { id: toUserId }, select: { balance: true, bankBalance: true } });
      if (!s || !r) throw new Error("USER_NOT_FOUND");

      let senderDeduct = amount;
      let receiverGain = amount;

      if (feeSide === "SENDER") senderDeduct += fee;
      if (feeSide === "RECEIVER") receiverGain -= fee;

      if (senderDeduct <= 0 || receiverGain <= 0) return { invalid: true };
      if (s.balance < senderDeduct) return { insufficient: true };

      const sNewWallet = s.balance - senderDeduct;
      await tx.user.update({ where: { id: senderId }, data: { balance: sNewWallet } });

      await tx.ledger.create({
        data: {
          userId: senderId,
          type: "TRANSFER",
          target: "WALLET",
          delta: -senderDeduct,
          fromTarget: null,
          toTarget: null,
          amount,
          fee: feeSide === "SENDER" ? fee : 0,
          memo: note,
          idempotencyKey: idem, // sender 分錄掛冪等鍵
          transferGroupId: groupId,
          peerUserId: toUserId,
          balanceAfter: sNewWallet,
          bankAfter: (await tx.user.findUnique({ where: { id: senderId }, select: { bankBalance: true } }))!.bankBalance,
          meta: { ip: req.headers.get("x-forwarded-for") || null, ua: req.headers.get("user-agent") || null, feeSide, feePct: feePct ?? 0 },
        },
      });

      const rNewWallet = r.balance + receiverGain;
      await tx.user.update({ where: { id: toUserId }, data: { balance: rNewWallet } });

      await tx.ledger.create({
        data: {
          userId: toUserId,
          type: "TRANSFER",
          target: "WALLET",
          delta: +receiverGain,
          fromTarget: null,
          toTarget: null,
          amount,
          fee: feeSide === "RECEIVER" ? fee : 0,
          memo: note,
          idempotencyKey: null,
          transferGroupId: groupId,
          peerUserId: senderId,
          balanceAfter: rNewWallet,
          bankAfter: (await tx.user.findUnique({ where: { id: toUserId }, select: { bankBalance: true } }))!.bankBalance,
          meta: { feeSide, feePct: feePct ?? 0 },
        },
      });

      return {
        sender: { wallet: sNewWallet, bank: (await tx.user.findUnique({ where: { id: senderId }, select: { bankBalance: true } }))!.bankBalance },
        receiver: { wallet: rNewWallet, bank: (await tx.user.findUnique({ where: { id: toUserId }, select: { bankBalance: true } }))!.bankBalance },
      };
    });

    if ((result as any).invalid) return NextResponse.json({ ok: false, error: "INVALID_FEE_OR_AMOUNT" }, { status: 400 });
    if ((result as any).insufficient) return NextResponse.json({ ok: false, error: "INSUFFICIENT_FUNDS" }, { status: 400 });

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const body = await req.json().catch(() => ({}));
      const toUserId = body?.toUserId;
      const idem = body?.idempotencyKey || readIdempotencyKey(req);
      const existed = idem ? await prisma.ledger.findUnique({ where: { idempotencyKey: idem } }) : null;
      if (existed) {
        const sender = await prisma.user.findUnique({ where: { id: existed.userId }, select: { balance: true, bankBalance: true } });
        const receiver = await prisma.user.findUnique({ where: { id: existed.peerUserId || toUserId }, select: { balance: true, bankBalance: true } });
        return NextResponse.json({ ok: true, data: { sender, receiver }, reused: true });
      }
    }
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
