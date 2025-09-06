// app/casino/baccarat/rooms/[room]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type BetSide =
  | "PLAYER" | "BANKER" | "TIE"
  | "PLAYER_PAIR" | "BANKER_PAIR" | "ANY_PAIR" | "PERFECT_PAIR" | "BANKER_SUPER_SIX";
const ALL_SIDES: BetSide[] = [
  "PLAYER", "BANKER", "TIE",
  "PLAYER_PAIR", "BANKER_PAIR", "ANY_PAIR", "PERFECT_PAIR", "BANKER_SUPER_SIX",
];
type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

export default function BaccaratRoomPage({ params }: { params: { room: RoomCode } }) {
  const room = params.room;
  const [phase, setPhase] = useState<Phase>("BETTING");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [wallet, setWallet] = useState<number>(0);
  const [pool, setPool] = useState<Partial<Record<BetSide, number>>>({});
  const [myBets, setMyBets] = useState<{ side: BetSide; amount: number }[]>([]);
  const [recent, setRecent] = useState<(string | null)[]>([]);
  const [amountInput, setAmountInput] = useState<number>(100);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`/api/casino/baccarat/round/current?room=${room}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (d.round) {
          setRoundId(d.round.id);
          setPhase(d.round.phase);
          setCountdown(d.round.countdown);
        }
        setWallet(d.wallet ?? 0);
        setPool(d.pool ?? {});
        setMyBets(d.myBets ?? []);
      })
      .catch(() => {});

    fetch(`/api/casino/baccarat/rooms/${room}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setRecent(d.room.recentOutcomes ?? []);
        if (d.room.roundId) setRoundId(d.room.roundId);
        setPhase(d.room.phase);
        setCountdown(d.room.countdown);
        setPool(d.room.pool ?? {});
      })
      .catch(() => {});
  }, [room]);

  useEffect(() => {
    const es = new EventSource(`/api/casino/baccarat/stream?room=${room}`);
    sseRef.current = es;
    es.addEventListener("ROOM_STATE", (ev: MessageEvent) => {
      const data = JSON.parse(ev.data);
      setPhase(data.phase);
      setCountdown(data.countdown);
      setRoundId(data.roundId);
    });
    es.addEventListener("TICK", (ev: MessageEvent) => {
      const data = JSON.parse(ev.data);
      setPhase(data.phase);
      setCountdown(data.countdown);
      setRoundId(data.roundId);
    });
    es.onerror = () => {};
    return () => es.close();
  }, [room]);

  const myTotals = useMemo(() => {
    const m = new Map<BetSide, number>();
    myBets.forEach(b => m.set(b.side, (m.get(b.side) ?? 0) + b.amount));
    return m;
  }, [myBets]);

  function addBet(side: BetSide) {
    if (phase !== "BETTING" || !roundId) {
      setToast("非投注時段");
      setTimeout(() => setToast(null), 1200);
      return;
    }
    const amt = Math.max(0, Math.floor(amountInput));
    if (!amt) return;
    setMyBets(b => [...b, { side, amount: amt }]);
  }
  function clearBets() { setMyBets([]); }
  function doubleBets() { setMyBets(b => b.map(x => ({ ...x, amount: x.amount * 2 }))); }

  async function placeNow() {
    if (!roundId || phase !== "BETTING" || placing) return;
    if (!myBets.length) return;
    setPlacing(true);
    try {
      const res = await fetch(`/api/casino/baccarat/bet`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, roundId, bets: myBets }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "下注失敗");
      setWallet(d.wallet ?? 0);
      setMyBets([]);
      setToast("下注成功");
      setTimeout(() => setToast(null), 1000);
      fetch(`/api/casino/baccarat/rooms/${room}`).then(r => r.json()).then(pr => setPool(pr.room.pool ?? {}));
    } catch (e: any) {
      setToast(e?.message ?? "下注失敗");
      setTimeout(() => setToast(null), 1400);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <main className="bk-wrap">
      <header className="bk-header">
        <div className="left">
          <Link href="/" className="bk-logo">TOPZCASINO</Link>
          <span className="bk-room">{room}</span>
        </div>
        <div className="center">
          <div className={`bk-phase ${phase.toLowerCase()}`}>{phase}</div>
          <div className="bk-count">{countdown}s</div>
        </div>
        <div className="right">
          <div className="bk-wallet">錢包：<b>{wallet.toLocaleString()}</b></div>
          <Link href="/casino/baccarat" className="bk-btn ghost">選房</Link>
        </div>
      </header>

      {/* 開牌區（預留動畫舞台） */}
      <section className="bk-reveal glass tilt">
        <div className="bk-reveal-title">開牌區</div>
        <div className="bk-reveal-stage">
          {/* 之後把發牌/翻牌動畫接進來 */}
          <div className="flip-hint">等待結算時會展示翻牌動畫</div>
        </div>
        <div className="scanline" />
      </section>

      <section className="bk-grid">
        {/* 下注池 + 近十局 */}
        <aside className="bk-card glass">
          <h3 className="bk-card-title">下注池</h3>
          <ul className="bk-pool">
            {ALL_SIDES.map(s => (
              <li key={s}><span>{s}</span><b>{(pool[s] ?? 0).toLocaleString()}</b></li>
            ))}
          </ul>

          <h3 className="bk-card-title mt">近十局</h3>
          <div className="bk-recent">
            {recent.map((o, i) => (
              <div key={i} className={`dot ${o === "PLAYER" ? "blue" : o === "BANKER" ? "red" : "gold"}`} />
            ))}
          </div>
        </aside>

        {/* 下注面板 */}
        <section className="bk-card glass wide">
          <div className="bk-chipbar">
            <input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(Math.max(0, Math.floor(Number(e.target.value || 0))))}
            />
            <div className="chips">
              {[50,100,200,500,1000,5000].map(v => (
                <button key={v} className="chip" onClick={() => setAmountInput(v)}>{v}</button>
              ))}
              <button className="chip ghost" onClick={clearBets}>清除</button>
              <button className="chip ghost" onClick={doubleBets}>加倍</button>
            </div>
          </div>

          <div className="bk-bets">
            {ALL_SIDES.map((s) => (
              <button
                key={s}
                disabled={phase !== "BETTING"}
                className={`bk-bet ${s.toLowerCase()}`}
                onClick={() => addBet(s)}
              >
                <span className="lbl">{s}</span>
                <span className="mine">{(myTotals.get(s) ?? 0).toLocaleString()}</span>
                <span className="hover-sheen" />
              </button>
            ))}
          </div>

          <div className="bk-actions">
            <button className="bk-btn primary" disabled={placing || phase !== "BETTING"} onClick={placeNow}>
              {placing ? "送出中…" : "送出下注"}
            </button>
          </div>
        </section>
      </section>

      {toast && <div className="bk-toast">{toast}</div>}
      <link rel="stylesheet" href="/styles/baccarat.css" />
    </main>
  );
}
