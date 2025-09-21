"use client";
import { useEffect, useRef, useState } from "react";
import type { RouletteRoomCode, RouletteBetKind } from "@prisma/client";
import RouletteWheel from "@/components/roulette/RouletteWheel";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

export default function RoomPage({ params }: { params: { room: RouletteRoomCode } }) {
  const room = params.room;
  const [state, setState] = useState<{ phase: Phase; msLeft: number; result?: number|null }>();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // 進房就啟動（用你現有的啟動 API）
    fetch("/api/casino/roulette/room/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    }).catch(()=>{});

    const loop = async () => {
      const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
      const j = await r.json();
      setState({ phase: j.round?.phase ?? j.phase, msLeft: j.msLeft ?? j.ms_left ?? 0, result: j.round?.result ?? j.result });
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
  const phase = state?.phase ?? "BETTING";

  return (
    <div className="rl-room">
      <header className="rl-head glass">
        <div className="left">
          <h1>輪盤 <small className="muted">房間：{room}</small></h1>
        </div>
        <div className={`phase pill ${phase.toLowerCase()}`}>
          {phase === "BETTING" && "投注中"}
          {phase === "REVEALING" && "開獎中"}
          {phase === "SETTLED" && "已結算"}
        </div>
        <div className="timer">倒數 <b>{sec}s</b></div>
      </header>

      <section className="rl-main">
        {/* 左：盤面 */}
        <div className="panel glass">
          <RouletteWheel
            size={320}
            phase={phase as any}
            result={state?.result ?? null}
            spinMs={10000}       // 10 秒動畫
            idleSpeed={10}
          />
          <div className="result-chip">
            {state?.result != null ? `結果：${state.result}` : "等待結果…"}
          </div>
        </div>

        {/* 右：下注面板（中文） */}
        <div className="panel glass bet-panel">
          <h3>快速下注</h3>
          <div className="chips">
            {[10, 50, 100, 500, 1000].map(v => (
              <button key={v} className="chip" onClick={() => place("RED_BLACK" as RouletteBetKind, v, { color: "RED" })}>紅 {v}</button>
            ))}
          </div>

          <h4>常用玩法</h4>
          <div className="grid grid-2">
            <button onClick={() => place("RED_BLACK" as RouletteBetKind, 50, { color: "RED" })}>紅</button>
            <button onClick={() => place("RED_BLACK" as RouletteBetKind, 50, { color: "BLACK" })}>黑</button>
            <button onClick={() => place("ODD_EVEN" as RouletteBetKind, 50, { odd: true })}>單</button>
            <button onClick={() => place("ODD_EVEN" as RouletteBetKind, 50, { odd: false })}>雙</button>
            <button onClick={() => place("LOW_HIGH" as RouletteBetKind, 50, { high: false })}>小(1–18)</button>
            <button onClick={() => place("LOW_HIGH" as RouletteBetKind, 50, { high: true })}>大(19–36)</button>
          </div>

          <h4>打／列</h4>
          <div className="grid grid-3">
            {[1,2,3].map(d => (
              <button key={`dozen-${d}`} onClick={() => place("DOZEN" as RouletteBetKind, 50, { dozen: d-1 })}>第{d}打</button>
            ))}
            {[1,2,3].map(c => (
              <button key={`col-${c}`} onClick={() => place("COLUMN" as RouletteBetKind, 50, { col: c-1 })}>第{c}列</button>
            ))}
          </div>

          <h4>直注（單號）</h4>
          <div className="nums">
            {Array.from({length:37}).map((_,i)=>(
              <button key={i} onClick={() => place("STRAIGHT" as RouletteBetKind, 10, { n: i })}>{i}</button>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .muted { opacity:.7; font-weight:400; }
        .rl-room { padding: 20px; }
        .glass {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
          backdrop-filter: blur(10px);
        }
        .rl-head {
          display:flex; align-items:center; gap:16px; padding:12px 16px; margin-bottom:16px;
        }
        .phase.pill {
          padding:6px 10px; border-radius:999px; font-weight:600;
          background: rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
        }
        .phase.betting { color:#26d37d; }
        .phase.revealing { color:#ffd34d; animation: glow 1.2s infinite; }
        .phase.settled { color:#aab; }
        .timer { margin-left:auto; }
        @keyframes glow {
          0% { text-shadow:0 0 0 rgba(255,240,120,.0); }
          50% { text-shadow:0 0 12px rgba(255,240,120,.9); }
          100% { text-shadow:0 0 0 rgba(255,240,120,.0); }
        }

        .rl-main { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
        .panel { padding:16px; }
        .panel .result-chip {
          margin-top:12px; font-weight:700; text-align:center; letter-spacing:.5px;
          color:#fff; opacity:.9;
        }

        .bet-panel h3 { margin:0 0 10px; }
        .bet-panel h4 { margin:16px 0 8px; font-size:14px; opacity:.9; }
        .chips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px; }
        .chip {
          padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06); cursor:pointer;
        }
        .grid { display:grid; gap:8px; }
        .grid-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .grid button, .nums button, .chip {
          color:#fff; font-weight:600; transition: transform .08s ease, background .2s;
        }
        .grid button:hover, .nums button:hover, .chip:hover { transform: translateY(-1px); background: rgba(255,255,255,.1); }
        .nums {
          display:grid; gap:6px; grid-template-columns: repeat(10, 1fr);
          max-height: 260px; overflow:auto; padding-right:4px;
        }
        .nums button {
          border:1px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 0; background: rgba(255,255,255,.04);
        }

        @media (max-width: 960px) {
          .rl-main { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
