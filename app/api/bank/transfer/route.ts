// app/api/bank/transfer/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { isValidAmount, readIdempotencyKey } from "@/lib/bank";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

function json<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

type FeeSide = "SENDER" | "RECEIVER" | "NONE";

export async function POST(req: Request) {
  // ---------- Auth ----------
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;
  if (!userId) return json({ ok: false, error: "UNAUTH" } as const, 401);

  // ---------- Parse body once ----------
  const body = (await req.json().catch(() => ({}))) as {
    toUserId?: string;
    amount?: unknown;
    note?: unknown;
    feePct?: unknown;
    feeSide?: unknown;
    idempotencyKey?: unknown;
  };

  const toUserId = typeof body.toUserId === "string" ? body.toUserId : "";
  const amount = Number(body.amount);
  const note = typeof body.note === "string" ? body.note : null;
  const feePct = typeof body.feePct === "number" ? body.feePct : undefined;
  const feeSide = (body.feeSide as FeeSide) ?? "NONE";
  const idem = (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null) || readIdempotencyKey(req);

  if (!toUserId) return json({ ok: false, error: "TO_REQUIRED" } as const, 400);
  if (!isValidAmount(amount)) return json({ ok: false, error: "INVALID_AMOUNT" } as const, 400);
  if (toUserId === String(userId)) {
    return json({ ok: false, error: "SELF_TRANSFER_NOT_ALLOWED" } as const, 400);
  }

  // ---------- Idempotency: fast path ----------
  if (idem) {
    const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
    if (existed) {
      const sender = await prisma.user.findUnique({
        where: { id: existed.userId },
        select: { balance: true, bankBalance: true },
      });
      const receiverId = existed.peerUserId || toUserId;
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { balance: true, bankBalance: true },
      });
      return json({ ok: true, data: { sender, receiver }, reused: true } as const);
    }
  }

  // ---------- Validate receiver ----------
  const receiver = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!receiver) return json({ ok: false, error: "RECEIVER_NOT_FOUND" } as const, 404);

  // ---------- Fee calc ----------
  const fee = feePct && feePct > 0 ? Math.floor(amount * feePct) : 0;

  try {
    const groupId = randomUUID();

    const result = await prisma.$transaction(async (tx) => {
      // 取雙方餘額
      const [s, r] = await Promise.all([
        tx.user.findUnique({ where: { id: String(userId) }, select: { balance: true, bankBalance: true } }),
        tx.user.findUnique({ where: { id: toUserId }, select: { balance: true, bankBalance: true } }),
      ]);
      if (!s || !r) throw new Error("USER_NOT_FOUND");

      let senderDeduct = amount;
      let receiverGain = amount;
      if (feeSide === "SENDER") senderDeduct += fee;
      if (feeSide === "RECEIVER") receiverGain -= fee;

      if (senderDeduct <= 0 || receiverGain <= 0) throw new Error("INVALID_FEE_OR_AMOUNT");
      if (s.balance < senderDeduct) throw new Error("INSUFFICIENT_FUNDS");

      // 更新餘額（錢包）
      const sNewWallet = s.balance - senderDeduct;
      const rNewWallet = r.balance + receiverGain;

      await tx.user.update({ where: { id: String(userId) }, data: { balance: sNewWallet } });
      await tx.user.update({ where: { id: toUserId }, data: { balance: rNewWallet } });

      // 建立雙分錄（TRANSFER）
      await tx.ledger.create({
        data: {
          userId: String(userId),
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
          bankAfter: s.bankBalance,
          meta: {
            ip: req.headers.get("x-forwarded-for") || null,
            ua: req.headers.get("user-agent") || null,
            feeSide,
            feePct: feePct ?? 0,
          } as Prisma.InputJsonValue,
        },
      });

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
          peerUserId: String(userId),
          balanceAfter: rNewWallet,
          bankAfter: r.bankBalance,
          meta: {
            feeSide,
            feePct: feePct ?? 0,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        sender: { wallet: sNewWallet, bank: s.bankBalance },
        receiver: { wallet: rNewWallet, bank: r.bankBalance },
      };
    });

    return json({ ok: true, data: result } as const);
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    const msg = e instanceof Error ? e.message : "";

    if (msg === "USER_NOT_FOUND") return json({ ok: false, error: "USER_NOT_FOUND" } as const, 400);
    if (msg === "INSUFFICIENT_FUNDS") return json({ ok: false, error: "INSUFFICIENT_FUNDS" } as const, 400);
    if (msg === "INVALID_FEE_OR_AMOUNT") return json({ ok: false, error: "INVALID_FEE_OR_AMOUNT" } as const, 400);

    if (code === "P2002" && idem) {
      // 冪等鍵重試：回傳當前兩端餘額
      const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
      if (existed) {
        const sender = await prisma.user.findUnique({
          where: { id: existed.userId },
          select: { balance: true, bankBalance: true },
        });
        const receiverId = existed.peerUserId || toUserId;
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { balance: true, bankBalance: true },
        });
        return json({ ok: true, data: { sender, receiver }, reused: true } as const);
      }
    }

    return json({ ok: false, error: "SERVER_ERROR" } as const, 500);
  }
}
