"use client";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

export default function RoomHud({
  room,
  phase,
  msLeft,
}: {
  room: string;
  phase: Phase;
  msLeft: number;
}) {
  const sec = Math.ceil(msLeft / 1000);
  return (
    <header className="rl-head glass">
      <div>
        <h1>
          輪盤 <small className="muted">房間：{room}</small>
        </h1>
      </div>
      <div className={`pill ${phase.toLowerCase()}`}>
        {phase === "BETTING" && "投注中"}
        {phase === "REVEALING" && "開獎中"}
        {phase === "SETTLED" && "已結算"}
      </div>
      <div className="timer">倒數 <b>{sec}s</b></div>
      <style jsx>{`
        .glass {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
          backdrop-filter: blur(10px);
        }
        .rl-head { display:flex; align-items:center; gap:16px; padding:12px 16px; margin-bottom:16px; }
        .muted { opacity:.7; font-weight:400; }
        .pill { padding:6px 10px; border-radius:999px; font-weight:600;
          background: rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); }
        .betting { color:#26d37d; }
        .revealing { color:#ffd34d; animation: glow 1.2s infinite; }
        .settled { color:#aab; }
        .timer { margin-left:auto; }
        @keyframes glow {
          0% { text-shadow:0 0 0 rgba(255,240,120,.0); }
          50% { text-shadow:0 0 12px rgba(255,240,120,.9); }
          100% { text-shadow:0 0 0 rgba(255,240,120,.0); }
        }
      `}</style>
    </header>
  );
}
