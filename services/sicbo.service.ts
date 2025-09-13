// services/sicbo.service.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  SicBoRoomCode,
  SicBoPhase,
  SicBoBetKind,
  LedgerType,
} from "@prisma/client";
import { creditTx } from "@/services/wallet.service";
import { taipeiNow } from "@/lib/time";

/* ----------------------------------------------------------------
   工具：擲骰、payload 檢查、派彩計算（完全內建）
-----------------------------------------------------------------*/

// 直接在這裡擲骰，回傳 number[3]
function rollDice(): [number, number, number] {
  const d = () => 1 + Math.floor(Math.random() * 6);
  return [d(), d(), d()];
}

// 基本統計
function sum3(d: number[]) { return (d?.[0] ?? 0) + (d?.[1] ?? 0) + (d?.[2] ?? 0); }
function isTriple(d: number[]) { return d.length === 3 && d[0] === d[1] && d[1] === d[2]; }
function countEye(d: number[], eye: number) { return d.filter(x => x === eye).length; }
function hasPair(d: number[], a: number, b: number) {
  // 是否包含一個 a 與一個 b（不必在相鄰位置）
  const da = d.indexOf(a);
  if (da === -1) return false;
  const tmp = d.slice();
  tmp.splice(da, 1); // 移除一個 a 再找 b
  return tmp.indexOf(b) !== -1;
}

// 驗證 payload（僅允許需要的欄位）
function _validatePayload(kind: SicBoBetKind, payload: any) {
  switch (kind) {
    case "TOTAL": {
      const total = Number(payload?.total);
      if (!Number.isInteger(total) || total < 4 || total > 17) {
        throw new Error("BAD_PAYLOAD_TOTAL");
      }
      return { total };
    }
    case "SPECIFIC_TRIPLE":
    case "SPECIFIC_DOUBLE":
    case "SINGLE_DIE": {
      const eye = Number(payload?.eye);
      if (!Number.isInteger(eye) || eye < 1 || eye > 6) {
        throw new Error("BAD_PAYLOAD_EYE");
      }
      return { eye };
    }
    case "COMBINATION": {
      const a = Number(payload?.a);
      const b = Number(payload?.b);
      if (![a, b].every(v => Number.isInteger(v) && v >= 1 && v <= 6) || a === b) {
        throw new Error("BAD_PAYLOAD_COMBO");
      }
      const [x, y] = a < b ? [a, b] : [b, a];
      return { a: x, b: y };
    }
    // 其他不需 payload
    default:
      return {};
  }
}
export const validatePayload = _validatePayload; // ← 給 bet route 用

// 總點數賠率表（經典 SicBo）
export const TOTAL_ODDS: Record<number, number> = {
  4: 50, 17: 50,
  5: 18, 16: 18,
  6: 14, 15: 14,
  7: 12, 14: 12,
  8: 8,  13: 8,
  9: 6,  12: 6,
  10: 6, 11: 6,
};

// 派彩計算（回傳「賠付金額」= 不含本金的純派彩）
function calcPayout(kind: SicBoBetKind, amount: number, payload: any, dice: [number, number, number]): number {
  const d = dice as number[];
  const s = sum3(d);
  const triple = isTriple(d);

  switch (kind) {
    case "BIG":
      // 11~17 且 非三同，1賠1
      return (!triple && s >= 11 && s <= 17) ? amount * 1 : 0;

    case "SMALL":
      // 4~10 且 非三同，1賠1
      return (!triple && s >= 4 && s <= 10) ? amount * 1 : 0;

    case "ODD":
      // 單，非三同，1賠1
      return (!triple && s % 2 === 1) ? amount * 1 : 0;

    case "EVEN":
      // 雙，非三同，1賠1
      return (!triple && s % 2 === 0) ? amount * 1 : 0;

    case "ANY_TRIPLE":
      // 任意豹子 1賠30
      return triple ? amount * 30 : 0;

    case "SPECIFIC_TRIPLE": {
      const eye = Number(payload?.eye);
      return (triple && d[0] === eye) ? amount * 150 : 0;
    }

    case "SPECIFIC_DOUBLE": {
      // 至少兩顆為該點 1賠8
      const eye = Number(payload?.eye);
      return countEye(d, eye) >= 2 ? amount * 8 : 0;
    }

    case "TOTAL": {
      const total = Number(payload?.total);
      const odd = TOTAL_ODDS[total as 4|5|6|7|8|9|10|11|12|13|14|15|16|17];
      return odd ? amount * odd : 0;
    }

    case "COMBINATION": {
      const a = Number(payload?.a);
      const b = Number(payload?.b);
      // 兩數組合（出現 a 與 b 各一顆即可）1賠5
      return hasPair(d, a, b) ? amount * 5 : 0;
    }

    case "SINGLE_DIE": {
      const eye = Number(payload?.eye);
      const c = countEye(d, eye); // 1顆=1賠1；2顆=1賠2；3顆=1賠3
      return c > 0 ? amount * c : 0;
    }

    default:
      return 0;
  }
}

/* ----------------------------------------------------------------
   讀設定
-----------------------------------------------------------------*/
async function readInt(key: string, fallback: number) {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "SICBO", key } },
  });
  return row?.valueInt ?? fallback;
}
async function readBool(key: string, fallback: boolean) {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "SICBO", key } },
  });
  return (row?.valueBool ?? null) === null ? fallback : !!row?.valueBool;
}

export async function getRoomMeta(room: SicBoRoomCode) {
  const baseInterval = await readInt("drawIntervalSec", 30);
  const lock = await readInt("lockBeforeRollSec", 5);
  const roomKey = `room.${room}.drawIntervalSec`;
  const roomInterval = await readInt(roomKey, room === "SB_R60" ? 60 : room === "SB_R90" ? 90 : 30);
  const autoRotate = await readBool("autoRotate", true);
  return {
    drawIntervalSec: roomInterval || baseInterval,
    lockBeforeRollSec: lock,
    autoRotate,
  };
}

/* ----------------------------------------------------------------
   找或輪轉回合（含自動鎖盤/結算/新局）
-----------------------------------------------------------------*/
export async function getOrRotateRound(room: SicBoRoomCode) {
  const meta = await getRoomMeta(room);
  let round = await prisma.sicBoRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  const now = taipeiNow();

  if (!round) {
    round = await prisma.sicBoRound.create({
      data: { room, phase: SicBoPhase.BETTING, dice: [] },
    });
  } else {
    const elapsed = (now.getTime() - round.startedAt.getTime()) / 1000;
    const willLockAt = meta.drawIntervalSec - meta.lockBeforeRollSec;

    if (round.phase === SicBoPhase.BETTING && elapsed >= willLockAt) {
      round = await prisma.sicBoRound.update({
        where: { id: round.id },
        data: { phase: SicBoPhase.REVEALING },
      });
      round = await revealAndSettle(round.id);
    }

    if (round.phase === SicBoPhase.REVEALING) {
      round = await revealAndSettle(round.id);
    }

    if (round.phase === SicBoPhase.SETTLED && meta.autoRotate) {
      round = await prisma.sicBoRound.create({
        data: { room, phase: SicBoPhase.BETTING, dice: [] },
      });
    }
  }

  const willLockAt = round.startedAt.getTime() + (meta.drawIntervalSec - meta.lockBeforeRollSec) * 1000;
  const endAt = round.startedAt.getTime() + meta.drawIntervalSec * 1000;

  const locked = round.phase !== "BETTING" || Date.now() >= willLockAt;
  const lockInSec = Math.max(0, Math.floor((willLockAt - Date.now()) / 1000));
  const endInSec = Math.max(0, Math.floor((endAt - Date.now()) / 1000));

  return { round, meta, locked, timers: { lockInSec, endInSec } };
}

/* ----------------------------------------------------------------
   結算（用內建 calcPayout；派彩走 creditTx；全程單一交易）
-----------------------------------------------------------------*/
export async function revealAndSettle(roundId: string) {
  return await prisma.$transaction(async (tx) => {
    let round = await tx.sicBoRound.findUnique({ where: { id: roundId } });
    if (!round) throw new Error("ROUND_NOT_FOUND");

    // 已結算且骰子齊全 → 直接回傳
    if (round.phase === SicBoPhase.SETTLED && (round.dice as number[] | null)?.length === 3) {
      return round;
    }

    // 補骰或使用現有骰
    const dice: [number, number, number] =
      (Array.isArray(round.dice) && round.dice.length === 3
        ? (round.dice as number[])
        : rollDice()) as [number, number, number];

    // 逐注單派彩
    const bets = await tx.sicBoBet.findMany({ where: { roundId: round.id } });

    for (const b of bets) {
      const payload = _validatePayload(b.kind as SicBoBetKind, b.payload);
      const payout = calcPayout(b.kind as SicBoBetKind, b.amount, payload, dice);

      if (payout > 0) {
        // 統一錢包入口：派彩（含 Ledger sicboRoom/sicboRoundId）
        await creditTx(tx, b.userId, "WALLET", payout, LedgerType.PAYOUT, {
          sicboRoom: round.room,
          sicboRoundId: round.id,
        });

        // 玩家統計
        await tx.user.update({
          where: { id: b.userId },
          data: {
            totalPayout: { increment: BigInt(payout) },
            netProfit: { increment: BigInt(payout) },
          },
        });
      }
    }

    // 收尾：寫骰與結束
    round = await tx.sicBoRound.update({
      where: { id: round.id },
      data: { phase: SicBoPhase.SETTLED, dice: dice as any, endedAt: taipeiNow() },
    });

    return round;
  });
}

/* ----------------------------------------------------------------
   歷史
-----------------------------------------------------------------*/
export async function getHistory(room: SicBoRoomCode, limit = 30) {
  return await prisma.sicBoRound.findMany({
    where: { room, phase: SicBoPhase.SETTLED },
    orderBy: { endedAt: "desc" },
    take: limit,
    select: { id: true, dice: true, endedAt: true },
  });
}
