export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { ensureCurrentRound, getLottoConfig, isLocked, picksKey } from "@/lib/lotto";

function readToken(req: Request){
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").map(s=>s.trim()).find(s=>s.startsWith("token="))?.slice(6) ?? "";
}

export async function POST(req: Request) {
  const p = verifyJWT<{ uid:string }>(readToken(req));
  if (!p?.uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const amount = Number(body?.amount || 0);

  const { round, cfg } = await ensureCurrentRound();
  const now = new Date();
  if (isLocked(now, round.drawAt, cfg.lockBeforeDrawSec) || round.status !== "OPEN") {
    return NextResponse.json({ error: "LOCKED" }, { status: 423 });
  }
  if (!cfg.betTiers.includes(amount)) {
    return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
  }

  // 三種模式：picks[] | specialSide | (ballIndex, attr)
  const picks: number[]|undefined = body?.picks;
  const specialSide: "ODD"|"EVEN"|undefined = body?.specialSide;
  const ballIndex: number|undefined = body?.ballIndex;
  const attr: "BIG"|"SMALL"|"ODD"|"EVEN"|undefined = body?.attr;

  let kind: "PICKS"|"SPECIAL_ODD"|"SPECIAL_EVEN"|"BALL_ATTR";
  let _picks:number[]=[]; let _picksKey="-"; let _ballIndex:number|undefined; let _attr:any;

  if (specialSide) {
    kind = specialSide === "ODD" ? "SPECIAL_ODD" : "SPECIAL_EVEN";
  } else if (ballIndex && attr) {
    if (ballIndex < 1 || ballIndex > 6) return NextResponse.json({ error: "INVALID_BALLINDEX" }, { status: 400 });
    kind = "BALL_ATTR"; _ballIndex = ballIndex; _attr = attr;
  } else if (Array.isArray(picks)) {
    if (picks.length !== cfg.picksCount) return NextResponse.json({ error:"INVALID_PICKS" }, { status: 400 });
    const set = new Set<number>();
    for (const n of picks) {
      if (typeof n!=="number" || n<1 || n>cfg.pickMax || set.has(n)) return NextResponse.json({ error:"INVALID_PICKS" }, { status: 400 });
      set.add(n);
    }
    _picks = picks.slice().sort((a,b)=>a-b);
    _picksKey = picksKey(_picks); kind = "PICKS";
  } else {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  const poolIn = Math.floor(amount * cfg.poolInBps / 10000);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({ where: { id: p.uid }, select: { balance:true, bankBalance:true } });
      if (!me || me.balance < amount) throw new Error("INSUFFICIENT");

      const afterBal = me.balance - amount;

      await tx.user.update({ where: { id: p.uid }, data: { balance: afterBal } });

      // Ledger：下注扣款（使用你的欄位：memo/target/delta/balanceAfter/bankAfter）
      await tx.ledger.create({
        data: {
          userId: p.uid,
          type: "BET_PLACED",
          target: "WALLET",
          delta: -amount,
          memo: `LOTTO bet #${round.code} (${kind}${kind==="PICKS"?" "+_picksKey:kind==="BALL_ATTR"?` B${_ballIndex}/${_attr}`:""})`,
          balanceAfter: afterBal,
          bankAfter: me.bankBalance,
        } as any
      });

      // pool 增加入池比例
      await tx.lottoRound.update({ where: { id: round.id }, data: { pool: { increment: poolIn } } });

      // upsert（對應兩條唯一鍵）
      const bet = kind === "BALL_ATTR"
        ? await tx.lottoBet.upsert({
            where: {
              userId_roundId_kind_ballIndex_attr: {
                userId: p.uid, roundId: round.id, kind, ballIndex: _ballIndex!, attr: _attr!
              }
            },
            create: { userId: p.uid, roundId: round.id, kind, ballIndex: _ballIndex, attr: _attr, amount },
            update: { amount: { increment: amount } }
          })
        : await tx.lottoBet.upsert({
            where: { userId_roundId_kind_picksKey: { userId: p.uid, roundId: round.id, kind, picksKey: _picksKey } },
            create: { userId: p.uid, roundId: round.id, kind, picks: _picks, picksKey: _picksKey, amount },
            update: { amount: { increment: amount } }
          });

      return { betId: bet.id, balanceAfter: afterBal };
    });

    return NextResponse.json({ ok:true, ...result });

  } catch (e:any) {
    if (e?.message === "INSUFFICIENT") return NextResponse.json({ error:"INSUFFICIENT_FUNDS" }, { status:409 });
    return NextResponse.json({ error:"BET_FAILED" }, { status:500 });
  }
}
