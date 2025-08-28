"use client";

import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ------- 通用 fetcher（禁止快取，帶上 cookie） -------
const fetcher = (url: string) =>
  fetch(url, { cache: "no-store", credentials: "include" }).then((r) => r.json());

// ------- 花色/點數 轉文字 -------
const SUITS = ["♠", "♥", "♦", "♣"] as const; // 0..3
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function cardLabel(c: { rank: number; suit: number } | null) {
  if (!c) return "";
  const r = RANKS[(c.rank - 1) % 13];
  const s = SUITS[c.suit % 4];
  return `${r}${s}`;
}

// ------- 翻牌卡片 -------
function FlipCard({
  card,
  flipped,
  sideName, // "P" or "B"
  index,
}: {
  card: { rank: number; suit: number } | null;
  flipped: boolean;
  sideName: "P" | "B";
  index: number;
}) {
  const red = card && (card.suit === 1 || card.suit === 2); // ♥♦ 紅色
  return (
    <div className="flip-perspective">
      <div className={`flip-card ${flipped ? "flip-card-flipped" : ""}`}>
        {/* 背面 */}
        <div className="flip-face flip-back">
          <div className="card-back-pattern" />
          <div className="card-tag">{sideName}{index+1}</div>
        </div>
        {/* 正面 */}
        <div className="flip-face flip-front">
          <div className={`card-face ${red ? "text-red-400" : "text-white"}`}>
            <span className="text-xl font-semibold tracking-wide">{cardLabel(card)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------- 主頁 -------
export default function RoomPage({ params }: { params: { room: string } }) {
  const roomCode = (params.room || "R60").toUpperCase();

  // 狀態 API（每秒輪詢）
  const { data, error } = useSWR(
    `/api/casino/baccarat/state?room=${roomCode}`,
    fetcher,
    { refreshInterval: 1000, dedupingInterval: 500, revalidateOnFocus: false }
  );

  // 錢包（每 3 秒更新一次）
  const { data: wallet } = useSWR(`/api/wallet`, fetcher, {
    refreshInterval: 3000, dedupingInterval: 1500, revalidateOnFocus: false,
  });

  const phase: "BETTING" | "REVEAL" | "SETTLED" = data?.phase ?? "BETTING";
  const secLeft = data?.secLeft ?? 0;
  const roundSeq = data?.roundSeq ?? 0;
  const duration = data?.room?.durationSeconds ?? 0;

  // ---- 翻牌動畫序列 ----
  // 我們用 flippedP[i], flippedB[i] 控制每張是否翻開
  const [flippedP, setFlippedP] = useState<boolean[]>([false, false, false]);
  const [flippedB, setFlippedB] = useState<boolean[]>([false, false, false]);
  const [showTotal, setShowTotal] = useState(false);

  const pCards = (data?.result?.playerCards as any[]) ?? [];
  const bCards = (data?.result?.bankerCards as any[]) ?? [];
  const pTotal = data?.result?.playerTotal ?? 0;
  const bTotal = data?.result?.bankerTotal ?? 0;
  const outcome = data?.result?.outcome as "PLAYER"|"BANKER"|"TIE"|undefined;

  const revealTimerRef = useRef<number[]>([]);

  // 當 phase 進入 REVEAL，啟動逐張翻牌
  useEffect(() => {
    // 清掉舊 timer
    for (const t of revealTimerRef.current) window.clearTimeout(t);
    revealTimerRef.current = [];
    setFlippedP([false, false, false]);
    setFlippedB([false, false, false]);
    setShowTotal(false);

    if (phase !== "REVEAL") return;

    // 動畫時間軸：每 600ms 翻一張
    const seq: Array<() => void> = [];

    // 閒1 -> 莊1 -> 閒2 -> 莊2 -> 閒3? -> 莊3?
    if (pCards[0]) seq.push(() => setFlippedP((s) => [true, s[1], s[2]]));
    if (bCards[0]) seq.push(() => setFlippedB((s) => [true, s[1], s[2]]));
    if (pCards[1]) seq.push(() => setFlippedP((s) => [s[0], true, s[2]]));
    if (bCards[1]) seq.push(() => setFlippedB((s) => [s[0], true, s[2]]));

    if (pCards[2]) seq.push(() => setFlippedP((s) => [s[0], s[1], true]));
    if (bCards[2]) seq.push(() => setFlippedB((s) => [s[0], s[1], true]));

    // 最後顯示點數
    seq.push(() => setShowTotal(true));

    // 排程
    seq.forEach((fn, i) => {
      const t = window.setTimeout(fn, 600 * (i + 1));
      revealTimerRef.current.push(t);
    });

    return () => {
      for (const t of revealTimerRef.current) window.clearTimeout(t);
      revealTimerRef.current = [];
    };
  }, [phase, pCards?.length, bCards?.length]);

  // ---- 下注 ----
  const [amount, setAmount] = useState<string>("100");
  const placeBet = useCallback(async (side: "PLAYER"|"BANKER"|"TIE"|"PLAYER_PAIR"|"BANKER_PAIR"|"ANY_PAIR"|"PERFECT_PAIR") => {
    const a = parseInt(amount, 10);
    if (!Number.isFinite(a) || a <= 0) return alert("金額錯誤");
    const res = await fetch(`/api/casino/baccarat/bet`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomCode, side, amount: a }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j?.error || "下注失敗");
  }, [amount, roomCode]);

  const phaseText =
    phase === "BETTING" ? "下注中" :
    phase === "REVEAL"  ? "開牌中" :
    phase === "SETTLED" ? "已結算" : "-";

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 text-white bg-gradient-to-b from-[#0a0f1a] to-[#0b1020]">
      {/* 內嵌動畫樣式（翻牌） */}
      <style jsx global>{`
        .flip-perspective { perspective: 1200px; width: 84px; height: 112px; }
        .flip-card {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d; transition: transform 500ms ease;
        }
        .flip-card-flipped { transform: rotateY(180deg); }
        .flip-face {
          position: absolute; inset: 0;
          backface-visibility: hidden; border-radius: 10px;
          display: grid; place-items: center;
          box-shadow: 0 10px 25px rgba(0,0,0,.3);
        }
        .flip-back {
          background: radial-gradient(120px 80px at 50% 20%, rgba(255,255,255,.15), rgba(255,255,255,.03) 60%, transparent 70%),
                      linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.02));
          border: 1px solid rgba(255,255,255,.2);
        }
        .card-back-pattern {
          width: 90%; height: 85%;
          background-image:
            radial-gradient(circle at 10px 10px, rgba(255,255,255,.2) 2px, transparent 2px),
            radial-gradient(circle at 30px 30px, rgba(255,255,255,.15) 2px, transparent 2px);
          background-size: 20px 20px, 20px 20px;
          background-position: 0 0, 10px 10px;
          filter: blur(.2px) saturate(1.1);
          border-radius: 8px;
        }
        .card-tag {
          position: absolute; bottom: 6px; right: 8px;
          font-size: 10px; letter-spacing: .1em; opacity: .7;
        }
        .flip-front {
          transform: rotateY(180deg);
          background: linear-gradient(180deg, rgba(0,0,0,.4), rgba(0,0,0,.65));
          border: 1px solid rgba(255,255,255,.2);
        }
        .card-face { font-variant-numeric: tabular-nums; }
        .shine {
          position: relative; overflow: hidden; isolation: isolate;
        }
        .shine::after {
          content: ""; position: absolute; inset: -200% -50%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,.12), transparent);
          transform: rotate(25deg); animation: shine 2.8s linear infinite;
        }
        @keyframes shine { 0% { transform: translateX(-60%) rotate(25deg); } 100% { transform: translateX(60%) rotate(25deg); } }
        .glass-panel {
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
          border: 1px solid rgba(255,255,255,.15);
          backdrop-filter: blur(12px);
        }
        .btn {
          @apply px-4 py-2 rounded-xl font-semibold transition active:scale-95;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.15);
        }
        .btn:hover { background: rgba(255,255,255,.14); }
        .btn-primary { background: linear-gradient(180deg, #22c55e, #16a34a); border-color: rgba(0,0,0,.2); }
        .btn-warn { background: linear-gradient(180deg, #ef4444, #b91c1c); border-color: rgba(0,0,0,.25); }
        .pill { @apply px-3 py-1 rounded-full text-xs font-semibold; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* 頂部資訊列 */}
        <div className="glass-panel rounded-2xl p-4 md:p-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <KV label="房間" value={roomCode} />
          <KV label="局長" value={`${duration}s`} />
          <KV label="局序" value={String(roundSeq).padStart(4, "0")} />
          <KV label="狀態" value={phaseText} />
          <KV label="倒數" value={`${secLeft}s`} />
        </div>

        {/* 桌面 / 翻牌動畫 */}
        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <div className="text-sm opacity-80 mb-3">百家樂桌</div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 閒 (PLAYER) */}
            <div className={`rounded-xl p-4 shine ${outcome==="PLAYER" ? "ring-2 ring-emerald-400/70" : "ring-1 ring-white/10"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold">閒 (PLAYER)</div>
                {showTotal && <div className="pill">點數 {pTotal}</div>}
              </div>
              <div className="flex items-center gap-3">
                <FlipCard card={pCards[0] ?? null} flipped={flippedP[0]} sideName="P" index={0}/>
                <FlipCard card={pCards[1] ?? null} flipped={flippedP[1]} sideName="P" index={1}/>
                {pCards[2] && <FlipCard card={pCards[2]} flipped={flippedP[2]} sideName="P" index={2}/>}
              </div>
            </div>

            {/* 莊 (BANKER) */}
            <div className={`rounded-xl p-4 shine ${outcome==="BANKER" ? "ring-2 ring-sky-400/70" : "ring-1 ring-white/10"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold">莊 (BANKER)</div>
                {showTotal && <div className="pill">點數 {bTotal}</div>}
              </div>
              <div className="flex items-center gap-3">
                <FlipCard card={bCards[0] ?? null} flipped={flippedB[0]} sideName="B" index={0}/>
                <FlipCard card={bCards[1] ?? null} flipped={flippedB[1]} sideName="B" index={1}/>
                {bCards[2] && <FlipCard card={bCards[2]} flipped={flippedB[2]} sideName="B" index={2}/>}
              </div>
            </div>
          </div>

          {/* 結果（和局 / 對子） */}
          {showTotal && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="pill">結果：{outcome ?? "-"}</span>
              {data?.result?.playerPair && <span className="pill">閒對</span>}
              {data?.result?.bankerPair && <span className="pill">莊對</span>}
              {data?.result?.anyPair && <span className="pill">任一對</span>}
              {data?.result?.perfectPair && <span className="pill">完美對</span>}
            </div>
          )}
        </div>

        {/* 下注面板 + 錢包 */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-4 md:p-6 md:col-span-2">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <div className="text-sm opacity-80 mb-1">下注金額</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:ring-2 ring-emerald-400/60"
                  placeholder="輸入金額"
                  inputMode="numeric"
                />
              </div>
              <div className="text-xs opacity-70">* 下注中才能下注（{duration}s）</div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["PLAYER","閒"],
                ["BANKER","莊"],
                ["TIE","和"],
                ["PLAYER_PAIR","閒對"],
                ["BANKER_PAIR","莊對"],
                ["ANY_PAIR","任一對"],
                ["PERFECT_PAIR","完美對"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  disabled={phase !== "BETTING"}
                  onClick={() => placeBet(k as any)}
                  className={`btn ${phase==="BETTING" ? "btn-primary" : "opacity-50 cursor-not-allowed"}`}
                  title={phase==="BETTING" ? "下注" : "目前不可下注"}
                >
                  下注 {label}
                </button>
              ))}
            </div>

            {/* 我的當局下注合計 */}
            <div className="mt-4 text-sm opacity-85">
              <div className="mb-1">我的當局投注：</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries((data?.myBets ?? {})).length === 0 && <span className="opacity-60">—</span>}
                {Object.entries((data?.myBets ?? {})).map(([side, amt]) => (
                  <span key={side} className="pill">{side}: {amt as number}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 錢包/銀行 */}
          <div className="glass-panel rounded-2xl p-4 md:p-6">
            <div className="text-sm opacity-80 mb-2">錢包</div>
            <div className="text-3xl font-bold tracking-wider">{wallet?.balance ?? 0}</div>
            <div className="mt-3 text-sm opacity-80 mb-2">銀行</div>
            <div className="text-xl font-semibold tracking-wider">{wallet?.bankBalance ?? 0}</div>
            <div className="text-xs opacity-60 mt-3">（餘額每 3 秒自動更新）</div>
          </div>
        </div>

        {/* 路子（近 10 局，以今日台北日） */}
        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-80">路子（近 10 局）</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(data?.recent ?? []).map((r: any) => (
              <div key={r.roundSeq} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15">
                #{r.roundSeq}：{r.outcome}（P{r.p}/B{r.b}）
              </div>
            ))}
            {(!data?.recent || data.recent.length === 0) && <div className="opacity-60 text-sm">尚無資料</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// 小元件：Key-Value
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 border border-white/15">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
