// app/api/admin/lotto/round/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toAdminRoundView } from "@/lib/lottoView"; // ✅ 用共用 helper

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 取得最新 N 期
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20", 10),
      100
    );

    const rows = await prisma.lottoRound.findMany({
      orderBy: { code: "desc" },
      take: limit,
      select: {
        id: true,
        code: true,
        status: true,
        drawAt: true,
        numbers: true,
        special: true,
        jackpot: true,
      },
    });

    return noStoreJson({
      ok: true,
      items: rows.map((r) => toAdminRoundView(r)),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}

// 建立新一期（管理員）
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const drawAt = body?.drawAt ? new Date(body.drawAt) : new Date();

    const latest = await prisma.lottoRound.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const nextCode = (latest?.code ?? 0) + 1;

    const created = await prisma.lottoRound.create({
      data: {
        code: nextCode,
        drawAt,
        status: "OPEN",
        numbers: [],
        special: null,
      },
      select: {
        id: true,
        code: true,
        status: true,
        drawAt: true,
        numbers: true,
        special: true,
        jackpot: true,
      },
    });

    return noStoreJson({
      ok: true,
      round: toAdminRoundView(created),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}

// 結算某期（管理員）
export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const roundId = body?.roundId as string;
    if (!roundId) return noStoreJson({ error: "roundId required" }, 400);

    // 抓下注 + 總獎金，這裡簡化示範
    const bets = await prisma.lottoBet.findMany({
      where: { roundId },
      select: { id: true, userId: true, amount: true },
    });
    const totalJackpot = bets.reduce((s, b) => s + b.amount, 0);

    const updatedRound = await prisma.lottoRound.update({
      where: { id: roundId },
      data: { status: "SETTLED", jackpot: totalJackpot },
      select: {
        id: true,
        code: true,
        status: true,
        drawAt: true,
        numbers: true,
        special: true,
        jackpot: true,
      },
    });

    return noStoreJson({
      ok: true,
      action: "SETTLE",
      round: toAdminRoundView(updatedRound), // ✅ 改這裡
      paidOut: totalJackpot,
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
