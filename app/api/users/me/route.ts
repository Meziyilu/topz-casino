// app/api/users/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getOrRotateRound, getHistory } from "@/services/sicbo.service";
import type { SicBoRoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 想要的房間列表（如有更多房間可自行擴充）
const ROOMS: SicBoRoomCode[] = ["SB_R30", "SB_R60", "SB_R90"];

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // 使用者基本資料
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        vipTier: true,
        headframe: true,
        panelTint: true,
        // （可加：totalStaked, totalPayout, netProfit ...）
      },
    });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    // ====== 骰寶快照（每個房間）======
    const sicbo = await Promise.all(
      ROOMS.map(async (room) => {
        // 取當前回合（會自動處理鎖盤/結算/開新局）
        const { round, timers, locked } = await getOrRotateRound(room);

        // 取玩家在當前回合的下注
        const myBets = await prisma.sicBoBet.findMany({
          where: { roundId: round.id, userId: auth.id },
          select: { kind: true, amount: true, payload: true },
          orderBy: { createdAt: "desc" },
        });
        const myStake = myBets.reduce((s, b) => s + b.amount, 0);

        // 最近 6 局歷史（已結算）
        const history = await getHistory(room, 6);

        return {
          room,
          round: {
            id: round.id,
            phase: round.phase,
            startedAt: round.startedAt,
            endedAt: round.endedAt ?? null,
            dice: (round.dice as number[]) ?? [],
          },
          timers, // { lockInSec, endInSec }
          locked,
          myBets,
          myStake,
          history: history.map((r) => ({
            id: r.id,
            endedAt: r.endedAt,
            dice: (r.dice as number[]) ?? [],
          })),
        };
      })
    );

    return NextResponse.json({
      ok: true,
      user,
      sicbo, // ← 前端可直接用這組資料渲染大廳/房內角落資訊
    });
  } catch (e) {
    console.error("USERS_ME_GET", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
