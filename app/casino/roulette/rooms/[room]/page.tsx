"use client";
import { useEffect, useRef, useState } from "react";
import type { RouletteRoomCode, RouletteBetKind } from "@prisma/client";
import RouletteWheel from "@/components/roulette/RouletteWheel";
import RouletteBall from "@/components/roulette/RouletteBall";
import s from "./page.module.css";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

export default function RoomPage({ params }: { params: { room: RouletteRoomCode } }) {
  const room = params.room;
  const [state, setState] = useState<{ phase: Phase; msLeft: number; result?: number | null }>();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/casino/roulette/room/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    }).catch(() => {});

    const loop = async () => {
      const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
      const j = await r.json();
      setState({
        phase: j.round?.phase ?? j.phase,
        msLeft: j.msLeft ?? j.ms_left ?? 0,
        result: j.round?.result ?? j.result,
      });
      timerRef.current = window.setTimeout(loop, 800);
    };
    loop();

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [room]);

  async function place(kind: RouletteBetKind, amount: number, payload?: any) {
    const r = await fetch(`/api/casino/roulette/bet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, kind, amount, payload }),
    });
    const j = await r.json();
    if (!j.ok) alert(j.error ?? "下注失敗");
  }

  const sec = Math.ceil((state?.msLeft ?? 0) / 1000);
  const phase = (state?.phase ?? "BETTING") as Phase;

  return (
    <div className={s.wrap}>
      <header className={`${s.head} ${s.glass}`}>
        <div>
          <h1>
            輪盤 <small className={s.muted}>房間：{room}</small>
          </h1>
        </div>
        <div className={`${s.pill} ${phase === "BETTING" ? s.betting : phase === "REVEALING" ? s.revealing : s.settled}`}>
          {phase === "BETTING" && "投注中"}
          {phase === "REVEALING" && "開獎中"}
          {phase === "SETTLED" && "已結算"}
        </div>
        <div className={s.timer}>
          倒數 <b>{sec}s</b>
        </div>
      </header>

      <section className={s.main}>
        {/* 左：單一盤面 + 球（球只渲染球，不渲染盤） */}
        <div className={`${s.panel} ${s.glass} ${s.wheelWrap}`}>
          <RouletteWheel size={320} phase={phase} result={state?.result ?? null} spinMs={10000} idleSpeed={10} />
          <RouletteBall
            ballOnly
            size={360}
            phase={phase}
            result={typeof state?.result === "number" ? state.result : undefined}
            onRevealEnd={() => {/* 動畫結束後要做的事 */}}
          />
          <div className={s.result}>{state?.result != null ? `結果：${state.result}` : "等待結果…"}</div>
        </div>

        {/* 右：下注面板（玻璃風） */}
        <div className={`${s.panel} ${s.glass} ${s.betPanel}`}>
          <h3>快速下注</h3>
          <div className={s.chips}>
            {[10, 50, 100, 500, 1000].map((v) => (
              <button key={v} className={s.chip} onClick={() => place("RED_BLACK" as RouletteBetKind, v, { color: "RED" })}>
                紅 {v}
              </button>
            ))}
          </div>

          <h4>常用玩法</h4>
          <div className={`${s.grid} ${s.grid2}`}>
            <button onClick={() => place("RED_BLACK" as RouletteBetKind, 50, { color: "RED" })}>紅</button>
            <button onClick={() => place("RED_BLACK" as RouletteBetKind, 50, { color: "BLACK" })}>黑</button>
            <button onClick={() => place("ODD_EVEN" as RouletteBetKind, 50, { odd: true })}>單</button>
            <button onClick={() => place("ODD_EVEN" as RouletteBetKind, 50, { odd: false })}>雙</button>
            <button onClick={() => place("LOW_HIGH" as RouletteBetKind, 50, { high: false })}>小(1–18)</button>
            <button onClick={() => place("LOW_HIGH" as RouletteBetKind, 50, { high: true })}>大(19–36)</button>
          </div>

          <h4>打／列</h4>
          <div className={`${s.grid} ${s.grid3}`}>
            {[1, 2, 3].map((d) => (
              <button key={`dozen-${d}`} onClick={() => place("DOZEN" as RouletteBetKind, 50, { dozen: d - 1 })}>第{d}打</button>
            ))}
            {[1, 2, 3].map((c) => (
              <button key={`col-${c}`} onClick={() => place("COLUMN" as RouletteBetKind, 50, { col: c - 1 })}>第{c}列</button>
            ))}
          </div>

          <h4>直注（單號）</h4>
          <div className={s.nums}>
            {Array.from({ length: 37 }).map((_, i) => (
              <button key={i} onClick={() => place("STRAIGHT" as RouletteBetKind, 10, { n: i })}>{i}</button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
