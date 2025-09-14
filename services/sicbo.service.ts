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
   工具：擲骰、payload 檢查、派彩計算
-----------------------------------------------------------------*/

function rollDice(): [number, number, number] {
  const d = () => 1 + Math.floor(Math.random() * 6);
  return [d(), d(), d()];
}

function sum3(d: number[]) { return (d?.[0] ?? 0) + (d?.[1] ?? 0) + (d?.[2] ?? 0); }
function isTriple(d: number[]) { return d.length === 3 && d[0] === d[1] && d[1] === d[2]; }
function countEye(d: number[], eye: number) { return d.filter(x => x === eye).length; }
function hasPair(d: number[], a: number, b: number) {
  const da = d.indexOf(a);
  if (da === -1) return false;
  const tmp = d.slice();
  tmp.splice(da, 1);
  return tmp.indexOf(b) !== -1;
}

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
    default:
      return {};
  }
}
export const validatePayload = _validatePayload;

export const TOTAL_ODDS: Record<number, number> = {
  4: 50, 17: 50,
  5: 18, 16: 18,
  6: 14, 15: 14,
  7: 12, 14: 12,
  8: 8,  13: 8,
  9: 6,  12: 6,
  10: 6, 11: 6,
};

function calcPayout(kind: SicBoBetKind, amount: number, payload: any, dice: [number, number, number]): number {
  const d = dice as number[];
  const s = sum3(d);
  const triple = isTriple(d);

  switch (kind) {
    case "BIG": return (!triple && s >= 11 && s <= 17) ? amount * 1 : 0;
    case "SMALL": return (!triple && s >= 4 && s <= 10) ? amount * 1 : 0;
    case "ODD": return (!triple && s % 2 === 1) ? amount * 1 : 0;
    case "EVEN": return (!triple && s % 2 === 0) ? amount * 1 : 0;
    case "ANY_TRIPLE": return triple ? amount * 30 : 0;
    case "SPECIFIC_TRIPLE": {
      const eye = Number(payload?.eye);
      return (triple && d[0] === eye) ? amount * 150 : 0;
    }
    case "SPECIFIC_DOUBLE": {
      const eye = Number(payload?.eye);
      return countEye(d, eye) >= 2 ? amount * 8 : 0;
    }
    case "TOTAL": {
      const total = Number(payload?.total);
      const odd = TOTAL_ODDS[total as keyof typeof TOTAL_ODDS];
      return odd ? amount * odd : 0;
    }
    case "COMBINATION": {
      const a = Number(payload?.a);
      const b = Number(payload?.b);
      return hasPair(d, a, b) ? amount * 5 : 0;
    }
    case "SINGLE_DIE": {
      const eye = Number(payload?.eye);
      const c = countEye(d, eye);
      return c > 0 ? amount * c : 0;
    }
    default: return 0;
  }
}

/* ----------------------------------------------------------------
   設定讀取 (BigInt-safe)
-----------------------------------------------------------------*/

function asNumber(v: number | bigint | null | undefined, d: number): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return d;
}

async function readInt(key: string, fallback: number) {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "SICBO", key } },
  });
  return asNumber(row?.valueInt, fallback);
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
   找或輪轉回合
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
   結算
-----------------------------------------------------------------*/
export async function revealAndSettle(roundId: string) {
  return await prisma.$transaction(async (tx) => {
    let round = await tx.sicBoRound.findUnique({ where: { id: roundId } });
    if (!round) throw new Error("ROUND_NOT_FOUND");

    if (round.phase === SicBoPhase.SETTLED && (round.dice as number[] | null)?.length === 3) {
      return round;
    }

    const dice: [number, number, number] =
      (Array.isArray(round.dice) && round.dice.length === 3
        ? (round.dice as number[])
        : rollDice()) as [number, number, number];

    const bets = await tx.sicBoBet.findMany({ where: { roundId: round.id } });

    for (const b of bets) {
      const payload = _validatePayload(b.kind as SicBoBetKind, b.payload);
      const payout = calcPayout(b.kind as SicBoBetKind, b.amount, payload, dice);

      if (payout > 0) {
        await creditTx(tx, b.userId, "WALLET", payout, LedgerType.PAYOUT, {
          sicboRoom: round.room,
          sicboRoundId: round.id,
        });

        await tx.user.update({
          where: { id: b.userId },
          data: {
            totalPayout: { increment: BigInt(payout) },
            netProfit: { increment: BigInt(payout) },
          },
        });
      }
    }

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
