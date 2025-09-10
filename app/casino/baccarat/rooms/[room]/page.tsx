"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** =========================
 * Types — 對齊 v1.1.2 後端概念（可依你實際 API 調整）
 * ========================= */
type RoundPhase = "BETTING" | "REVEALING" | "SETTLED";
type Outcome = "PLAYER" | "BANKER" | "TIE" | null;
type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR"
  | "ANY_PAIR"
  | "PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

type StateResp = {
  serverTime: string; // ISO
  current: {
    room: "R30" | "R60" | "R90" | string;
    roundSeq: number;
    phase: RoundPhase;
    // 倒數結束時間（BETTING: 收注時間；REVEALING: 揭示完成時間）
    endsAt: string; // ISO
    // 牌面（已決定），但翻牌順序走前端動畫
    playerCards: string[]; // e.g., ["A♠","9♥","5♦"] or ["K♣","8♠"]
    bankerCards: string[];
    outcome: Outcome; // SETTLED 才會有，其他為 null
  };
  my: {
    // 可用於房內「我的下注合計」
    totals: Partial<Record<BetSide, number>>;
  };
  config: {
    bettingSeconds: number;
    revealFlipIntervalMs: number; // 單張翻牌間隔
  };
  history?: {
    lastOutcomes: Outcome[]; // 路子用（簡化）
  };
};

type PlaceBetReq = { side: BetSide; amount: number; room: string };
type PlaceBetResp = { ok: boolean; err?: string };

/** =========================
 * 小工具
 * ========================= */
const fmt = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString("zh-TW");

function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// 把 "A♠" 解析為 { rank: "A", suit: "♠" }
function parseCard(code: string): { rank: string; suit: string } {
  // 允許 "A♠" 或 "A-S" 或 "AS" 之類；此處做最常見格式
  const m = code.match(/^([2-9]|10|J|Q|K|A)\s*([♠♣♥♦SCDH])$/i);
  if (m) {
    const rank = m[1];
    const s = m[2].toUpperCase();
    const suitMap: Record<string, string> = {
      S: "♠",
      C: "♣",
      H: "♥",
      D: "♦",
      "♠": "♠",
      "♣": "♣",
      "♥": "♥",
      "♦": "♦",
    };
    return { rank, suit: suitMap[s] || "♠" };
  }
  // 退而求其次：取最後一個字元當花色
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  return { rank: rank || "?", suit: suit || "♠" };
}

/** =========================
 * 牌與動畫組件
 * ========================= */

// 單張撲克牌（含翻轉）
function Card({
  code,
  faceUp,
  delayMs = 0,
}: {
  code: string;
  faceUp: boolean;
  delayMs?: number;
}) {
  const { rank, suit } = useMemo(() => parseCard(code), [code]);
  const isRed = suit === "♥" || suit === "♦";

  return (
    <div
      className="card-3d w-16 h-24 md:w-20 md:h-28"
      style={{
        animationDelay: `${Math.max(0, delayMs)}ms`,
      }}
      data-faceup={faceUp ? "1" : "0"}
    >
      {/* 正面 */}
      <div className={cx("card-face card-front", isRed && "text-red-500")}>
        <div className="flex flex-col w-full h-full justify-between p-2">
          <div className="text-xs md:text-sm font-semibold">{rank}</div>
          <div className="text-center text-lg md:text-2xl">{suit}</div>
          <div className="text-right text-xs md:text-sm font-semibold rotate-180">
            {rank}
          </div>
        </div>
      </div>
      {/* 背面 */}
      <div className="card-face card-back">
        <div className="w-full h-full grid place-items-center">
          <div className="w-12 h-12 rounded-md opacity-90 backdrop-blur-sm glass-tile" />
        </div>
      </div>
    </div>
  );
}

// 一手牌（玩家或莊家）+ 贏家金框閃三下
function HandView({
  title,
  cards,
  faceUps, // 每張是否翻開
  winner, // 此手是否獲勝（TIE 則兩邊都閃）
  baseDelay = 0,
}: {
  title: string;
  cards: string[];
  faceUps: boolean[];
  winner: boolean;
  baseDelay?: number;
}) {
  return (
    <div
      className={cx(
        "rounded-xl p-3 md:p-4 glass-panel border transition-shadow",
        winner ? "winner-flash border-amber-400" : "border-white/10"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-80">{title}</div>
        {winner && (
          <div className="text-xs font-semibold text-amber-300">WINNER</div>
        )}
      </div>
      <div className="flex gap-2 md:gap-3">
        {cards.map((c, i) => (
          <Card
            key={`${title}-${i}-${c}`}
            code={c}
            faceUp={!!faceUps[i]}
            delayMs={baseDelay + i * 600}
          />
        ))}
      </div>
    </div>
  );
}

/** =========================
 * 主頁面
 * ========================= */
export default function BaccaratRoomPage({
  params,
}: {
  params: { room: string };
}) {
  const room = decodeURIComponent(params.room);

  // 狀態
  const [S, setS] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  // 下注
  const [amount, setAmount] = useState<number>(0);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);

  // 翻牌控制：在 REVEALING 時，按順序依序翻面
  const [pFace, setPFace] = useState<boolean[]>([false, false, false]);
  const [bFace, setBFace] = useState<boolean[]>([false, false, false]);

  const prevPhase = useRef<RoundPhase | null>(null);
  const revealTimer = useRef<number | null>(null);

  // 倒數
  const now = useRef<number>(Date.now());
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => {
      now.current = Date.now();
      forceTick((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const countdownLabel = useMemo(() => {
    if (!S) return "--";
    const ends = new Date(S.current.endsAt).getTime();
    const sec = Math.max(0, Math.ceil((ends - now.current) / 1000));
    return `${sec}s`;
  }, [S, now.current]);

  /** 輪詢目前狀態 */
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/casino/baccarat/state?room=${encodeURIComponent(room)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as StateResp;

      // 保底 config 值
      data.config = {
        bettingSeconds: data.config?.bettingSeconds ?? 20,
        revealFlipIntervalMs: data.config?.revealFlipIntervalMs ?? 600,
      };

      setS(data);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "載入失敗");
    }
  }, [room]);

  // 首次/每秒輪詢
  useEffect(() => {
    setLoading(true);
    fetchState().finally(() => setLoading(false));
    const t = window.setInterval(fetchState, 1000);
    return () => clearInterval(t);
  }, [fetchState]);

  // 監聽 phase 變化 → 控制翻牌動畫
  useEffect(() => {
    const phase = S?.current.phase ?? null;
    const curP = S?.current.playerCards ?? [];
    const curB = S?.current.bankerCards ?? [];

    // BETTING → 清空翻面
    if (phase === "BETTING") {
      setPFace([false, false, false]);
      setBFace([false, false, false]);
    }

    // 進入 REVEALING → 按序翻牌
    if (phase === "REVEALING" && prevPhase.current !== "REVEALING") {
      const interval = S?.config.revealFlipIntervalMs ?? 600;
      // 翻順序：P1, B1, P2, B2, (視情況)P3, (視情況)B3
      const steps: Array<() => void> = [];
      if (curP[0]) steps.push(() => setPFace((s) => [true, s[1], s[2]]));
      if (curB[0]) steps.push(() => setBFace((s) => [true, s[1], s[2]]));
      if (curP[1]) steps.push(() => setPFace((s) => [s[0], true, s[2]]));
      if (curB[1]) steps.push(() => setBFace((s) => [s[0], true, s[2]]));
      if (curP[2]) steps.push(() => setPFace((s) => [s[0], s[1], true]));
      if (curB[2]) steps.push(() => setBFace((s) => [s[0], s[1], true]));

      // 執行序列
      let i = 0;
      const run = () => {
        steps[i]?.();
        i++;
        if (i < steps.length) {
          revealTimer.current = window.setTimeout(run, interval);
        }
      };
      // 啟動
      revealTimer.current = window.setTimeout(run, 200);
    }

    prevPhase.current = phase;
    return () => {
      if (revealTimer.current) {
        clearTimeout(revealTimer.current);
        revealTimer.current = null;
      }
    };
  }, [S?.current.phase, S?.current.playerCards, S?.current.bankerCards, S?.config.revealFlipIntervalMs]);

  /** 下單 */
  const placeBet = useCallback(
    async (side: BetSide) => {
      if (!amount || amount <= 0) {
        setToast({ type: "warn", text: "請輸入下注金額" });
        return;
      }
      if (S?.current.phase !== "BETTING") {
        setToast({ type: "warn", text: "本局已停止下注" });
        return;
      }
      setPlacing(true);
      try {
        const body: PlaceBetReq = { side, amount, room };
        const res = await fetch(`/api/casino/baccarat/bet`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as PlaceBetResp;
        if (!res.ok || !data.ok) {
          throw new Error(data?.err || `下單失敗 (${res.status})`);
        }
        setToast({ type: "ok", text: "下注成功" });
        fetchState();
      } catch (e: any) {
        setToast({ type: "err", text: e?.message || "下注失敗" });
      } finally {
        setPlacing(false);
      }
    },
    [amount, room, S?.current.phase, fetchState]
  );

  // UI helpers
  const myTotals = S?.my?.totals || {};
  const outcome = S?.current.outcome ?? null;
  const playerWin = outcome === "PLAYER" || outcome === "TIE";
  const bankerWin = outcome === "BANKER" || outcome === "TIE";

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      {/* 樣式（翻牌 + 金框閃爍 + 玻璃） */}
      <style jsx global>{`
        .glass-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
          box-shadow: 0 6px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .glass-tile {
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.35), rgba(255,255,255,0.05));
          border: 1px dashed rgba(255,255,255,0.18);
        }
        .card-3d {
          position: relative;
          perspective: 800px;
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
        }
        .card-3d .card-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 0.6rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(20,20,30,0.75);
        }
        .card-3d .card-front {
          background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
          color: #e5e7eb;
        }
        .card-3d .card-back {
          transform: rotateY(180deg);
          background: linear-gradient(180deg, rgba(49,46,129,0.35), rgba(17,24,39,0.6));
        }
        .card-3d[data-faceup="1"] {
          transform: rotateY(0deg);
        }
        .card-3d[data-faceup="0"] {
          transform: rotateY(180deg);
        }

        @keyframes winnerBlink {
          0% { box-shadow: 0 0 0 rgba(251,191,36,0), 0 0 0 rgba(251,191,36,0); }
          20% { box-shadow: 0 0 20px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.35); }
          40% { box-shadow: 0 0 10px rgba(251,191,36,0.5), 0 0 20px rgba(251,191,36,0.2); }
          100% { box-shadow: 0 0 0 rgba(251,191,36,0), 0 0 0 rgba(251,191,36,0); }
        }
        .winner-flash {
          border-width: 2px !important;
          animation: winnerBlink 0.6s ease-in-out 0s 3;
        }
      `}</style>

      {/* 房間資訊列 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Info tile title="房間" value={S?.current.room || room} />
        <Info tile title="局序" value={S ? `#${S.current.roundSeq}` : "--"} />
        <Info
          tile
          title="階段"
          value={
            S?.current.phase === "BETTING"
              ? "下注中"
              : S?.current.phase === "REVEALING"
              ? "開牌中"
              : S?.current.phase === "SETTLED"
              ? "已結算"
              : "--"
          }
        />
        <Info tile title="倒數" value={S ? countdownLabel : "--"} />
        <Info tile title="目前時間" value={new Date().toLocaleTimeString()} />
      </div>

      {/* 翻牌區（玩家 / 莊家） */}
      <div className="grid md:grid-cols-2 gap-4">
        <HandView
          title="PLAYER"
          cards={S?.current.playerCards || []}
          faceUps={pFace}
          winner={!!S && playerWin && S.current.phase === "SETTLED"}
          baseDelay={0}
        />
        <HandView
          title="BANKER"
          cards={S?.current.bankerCards || []}
          faceUps={bFace}
          winner={!!S && bankerWin && S.current.phase === "SETTLED"}
          baseDelay={150}
        />
      </div>

      {/* 注單資訊列（示範：你的 API 可直接帶 totals） */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Info title="我壓閒" value={`${fmt(myTotals.PLAYER)} 元`} color="cyan" />
        <Info title="我壓和" value={`${fmt(myTotals.TIE)} 元`} color="amber" />
        <Info title="我壓莊" value={`${fmt(myTotals.BANKER)} 元`} color="rose" />
        <Info title="我壓對子" value={`${fmt((myTotals.PLAYER_PAIR ?? 0) + (myTotals.BANKER_PAIR ?? 0))} 元`} />
        <Info title="本局合計" value={`${fmt(
          Object.values(myTotals).reduce((a, b) => a + (b ?? 0), 0)
        )} 元`} wide />
      </div>

      {/* 下注面板 */}
      <div className="glass-panel rounded-xl p-4 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="grow">
            <label className="text-sm opacity-80">下注金額</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value || 0)))}
              className="mt-1 w-full rounded-lg px-3 py-2 bg-black/30 border border-white/10 outline-none focus:ring-2"
              placeholder="輸入金額"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[100, 200, 500, 1000, 2000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition"
                >
                  {v.toLocaleString()}$
                </button>
              ))}
              <button
                onClick={() => setAmount(0)}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition"
              >
                清除
              </button>
              <button
                onClick={() => setAmount((a) => a * 2)}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition"
              >
                加倍
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 grow">
            <BetBtn text="閒 (PLAYER)" hue="cyan" onClick={() => placeBet("PLAYER")} disabled={placing} />
            <BetBtn text="莊 (BANKER)" hue="rose" onClick={() => placeBet("BANKER")} disabled={placing} />
            <BetBtn text="和 (TIE)" hue="amber" onClick={() => placeBet("TIE")} disabled={placing} />
            <BetBtn text="超級6" hue="pink" onClick={() => placeBet("BANKER_SUPER_SIX")} disabled={placing} />
            <BetBtn text="閒對 (P.Pair)" hue="sky" onClick={() => placeBet("PLAYER_PAIR")} disabled={placing} />
            <BetBtn text="莊對 (B.Pair)" hue="violet" onClick={() => placeBet("BANKER_PAIR")} disabled={placing} />
            <BetBtn text="任一對 (Any)" hue="fuchsia" onClick={() => placeBet("ANY_PAIR")} disabled={placing} />
            <BetBtn text="完美對 (Perf.)" hue="emerald" onClick={() => placeBet("PERFECT_PAIR")} disabled={placing} />
          </div>
        </div>

        {S?.current.phase !== "BETTING" && (
          <div className="mt-3 text-xs opacity-80">
            現在非下注階段（{S?.current.phase === "REVEALING" ? "開牌中" : "已結算"}）
          </div>
        )}
      </div>

      {/* 路子（簡化展示，可替換成你的 RoadmapPanel） */}
      <div className="glass-panel rounded-xl p-4 border border-white/10">
        <div className="text-sm opacity-80 mb-2">近期結果</div>
        <div className="flex flex-wrap gap-1">
          {(S?.history?.lastOutcomes ?? []).map((o, idx) => (
            <span
              key={idx}
              className={cx(
                "px-2 py-0.5 rounded-md text-xs border",
                o === "PLAYER" && "bg-cyan-500/20 border-cyan-500/30",
                o === "BANKER" && "bg-rose-500/20 border-rose-500/30",
                o === "TIE" && "bg-amber-500/20 border-amber-500/30"
              )}
            >
              {o ?? "-"}
            </span>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cx(
            "fixed left-1/2 -translate-x-1/2 bottom-6 px-4 py-2 rounded-lg border shadow-lg glass-panel z-50",
            toast.type === "ok" && "border-emerald-400/40",
            toast.type === "warn" && "border-amber-400/40",
            toast.type === "err" && "border-rose-400/40"
          )}
          onAnimationEnd={() => setToast(null)}
        >
          {toast.text}
        </div>
      )}

      {/* 載入/錯誤 */}
      {loading && <div className="text-sm opacity-70">載入中…</div>}
      {error && <div className="text-sm text-rose-300">錯誤：{error}</div>}
    </div>
  );
}

/** =========================
 * 小型 UI 元件
 * ========================= */

function Info({
  title,
  value,
  tile = false,
  wide = false,
  color,
}: {
  title: string;
  value: string;
  tile?: boolean;
  wide?: boolean;
  color?: "cyan" | "rose" | "amber";
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-white/10",
        tile ? "glass-panel p-3" : "p-2",
        wide && "col-span-2"
      )}
    >
      <div className="text-xs opacity-70">{title}</div>
      <div
        className={cx(
          "mt-0.5 text-sm md:text-base font-semibold",
          color === "cyan" && "text-cyan-300",
          color === "rose" && "text-rose-300",
          color === "amber" && "text-amber-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function BetBtn({
  text,
  onClick,
  disabled,
  hue,
}: {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  hue:
    | "cyan"
    | "rose"
    | "amber"
    | "pink"
    | "sky"
    | "violet"
    | "fuchsia"
    | "emerald";
}) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-400/10 border-cyan-400/30 hover:border-cyan-300/50",
    rose: "from-rose-500/20 to-rose-400/10 border-rose-400/30 hover:border-rose-300/50",
    amber: "from-amber-500/20 to-amber-400/10 border-amber-400/30 hover:border-amber-300/50",
    pink: "from-pink-500/20 to-pink-400/10 border-pink-400/30 hover:border-pink-300/50",
    sky: "from-sky-500/20 to-sky-400/10 border-sky-400/30 hover:border-sky-300/50",
    violet: "from-violet-500/20 to-violet-400/10 border-violet-400/30 hover:border-violet-300/50",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-400/10 border-fuchsia-400/30 hover:border-fuchsia-300/50",
    emerald: "from-emerald-500/20 to-emerald-400/10 border-emerald-400/30 hover:border-emerald-300/50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-lg px-3 py-2 border transition glass-panel",
        "bg-gradient-to-br",
        colorMap[hue],
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="text-sm font-semibold">{text}</div>
    </button>
  );
}
