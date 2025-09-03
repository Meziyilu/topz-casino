"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";

/* ================= Types ================= */
type Outcome = "PLAYER" | "BANKER" | "TIE" | null;
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type RoomCode = "R30" | "R60" | "R90";
type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR"
  | "ANY_PAIR"
  | "PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

type Card = { rank: number; suit: "S" | "H" | "D" | "C" } | string;

type StateResp = {
  room: { code: RoomCode; name: string; durationSeconds: number };
  day: string;
  roundId: string | null;
  roundSeq: number; // 佔位
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Exclude<Outcome, null>; p: number; b: number };
  cards?: { player: Card[]; banker: Card[] };
  myBets: Record<BetSide, number>;
  balance: number | null;
  recent: { roundSeq: number; outcome: Exclude<Outcome, null>; p: number; b: number }[];
  status?: "CLOSED";
};

type MyBetsResp = { items: { side: BetSide; amount: number }[] };

/* =============== Labels & Helpers =============== */
const zhPhase: Record<Phase, string> = {
  BETTING: "下注中",
  REVEALING: "開牌中",
  SETTLED: "已結算",
};
const zhOutcome: Record<Exclude<Outcome, null>, string> = {
  PLAYER: "閒",
  BANKER: "莊",
  TIE: "和",
};
const PAYOUT_HINT: Record<BetSide, string> = {
  PLAYER: "1 : 1",
  BANKER: "1 : 1（6點半賠）",
  TIE: "1 : 8",
  PLAYER_PAIR: "1 : 11",
  BANKER_PAIR: "1 : 11",
  ANY_PAIR: "1 : 5",
  PERFECT_PAIR: "1 : 25",
  BANKER_SUPER_SIX: "1 : 12",
};

function pad4(n: number) {
  return n.toString().padStart(4, "0");
}
function formatTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** 把 {rank,suit} 或字串卡面轉成 "Q♥" 顯示（安全） */
function cardToLabel(c: Card): string {
  if (c == null) return "?";
  if (typeof c === "string") return c;

  const rankMap: Record<string | number, string> = {
    1: "A",
    11: "J",
    12: "Q",
    13: "K",
    A: "A",
    J: "J",
    Q: "Q",
    K: "K",
    a: "A",
    j: "J",
    q: "Q",
    k: "K",
  };
  const suitMap: Record<string | number, string> = {
    S: "♠",
    s: "♠",
    0: "♠",
    H: "♥",
    h: "♥",
    1: "♥",
    D: "♦",
    d: "♦",
    2: "♦",
    C: "♣",
    c: "♣",
    3: "♣",
    SPADE: "♠",
    HEART: "♥",
    DIAMOND: "♦",
    CLUB: "♣",
  };

  const r = (c as any).rank ?? (c as any).value ?? "?";
  const s = (c as any).suit ?? (c as any).s ?? "?";

  const rStr = typeof r === "number" ? rankMap[r] ?? String(r) : rankMap[r] ?? String(r).toUpperCase();
  const sStr = suitMap[s] ?? suitMap[String(s).toUpperCase()] ?? "■";
  return `${rStr}${sStr}`;
}

function fmtOutcome(o: Outcome) {
  return o ? zhOutcome[o] : "—";
}

/** 從牌面/點數推導對子／完美對子／超級六 */
function deriveFlags(state: StateResp) {
  const pc = (state.cards?.player ?? []) as any[];
  const bc = (state.cards?.banker ?? []) as any[];
  const p0 = pc[0], p1 = pc[1], b0 = bc[0], b1 = bc[1];

  const sameRank = (a?: any, b?: any) => !!(a && b && (a.rank ?? a.value) === (b.rank ?? b.value));
  const sameSuit = (a?: any, b?: any) => !!(a && b && (a.suit ?? a.s) === (b.suit ?? b.s));

  const playerPair = sameRank(p0, p1);
  const bankerPair = sameRank(b0, b1);
  const perfectPair = (playerPair && sameSuit(p0, p1)) || (bankerPair && sameSuit(b0, b1));
  const anyPair = playerPair || bankerPair;
  const super6 = state.result?.outcome === "BANKER" && state.result?.b === 6;

  return { playerPair, bankerPair, anyPair, perfectPair, super6 };
}

/* ================== Animation Components ================== */
function PlayingCard({
  label,
  show,
  flip,
  delayMs = 0,
}: {
  label: string;
  show: boolean;
  flip: boolean;
  delayMs?: number;
}) {
  return (
    <div
      className={`w-14 h-20 rounded-xl border border-white/20 relative 
                  [perspective:800px] transition-opacity duration-300
                  ${show ? "opacity-100" : "opacity-0"}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {/* 卡片背面 */}
      <div
        className={`absolute inset-0 rounded-xl bg-white/10 grid place-items-center
                    [transform-style:preserve-3d] backface-hidden
                    ${flip ? "rotate-y-180" : "rotate-y-0"}
                    transition-transform duration-500`}
        style={{ transitionDelay: `${delayMs}ms` }}
      >
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/15" />
      </div>

      {/* 卡片正面 */}
      <div
        className={`absolute inset-0 rounded-xl bg-white text-black font-bold grid place-items-center
                    [transform-style:preserve-3d] backface-hidden rotate-y-180
                    transition-transform duration-500 border border-black/10`}
        style={{ transitionDelay: `${delayMs}ms` }}
      >
        <span className="text-lg">{label}</span>
      </div>
    </div>
  );
}

type CardLabel = string;

function useBaccaratReveal(params: {
  phase: Phase;
  playerLabels: CardLabel[];
  bankerLabels: CardLabel[];
  outcome: Exclude<Outcome, null> | null;
}) {
  const { phase, playerLabels, bankerLabels, outcome } = params;

  const [showP, setShowP] = useState([false, false, false]);
  const [flipP, setFlipP] = useState([false, false, false]);
  const [showB, setShowB] = useState([false, false, false]);
  const [flipB, setFlipB] = useState([false, false, false]);

  const [winnerGlow, setWinnerGlow] = useState<"PLAYER" | "BANKER" | "TIE" | null>(null);

  const p3 = playerLabels[2] != null;
  const b3 = bankerLabels[2] != null;

  const script = useMemo(() => {
    const steps: { at: number; act: () => void }[] = [];
    let t = 0;
    const stepGap = 180;
    const flipGap = 150;

    // P1
    steps.push({ at: (t += stepGap), act: () => setShowP((s) => [true, s[1], s[2]]) });
    steps.push({ at: (t += flipGap), act: () => setFlipP((s) => [true, s[1], s[2]]) });
    // B1
    steps.push({ at: (t += stepGap), act: () => setShowB((s) => [true, s[1], s[2]]) });
    steps.push({ at: (t += flipGap), act: () => setFlipB((s) => [true, s[1], s[2]]) });
    // P2
    steps.push({ at: (t += stepGap), act: () => setShowP((s) => [s[0], true, s[2]]) });
    steps.push({ at: (t += flipGap), act: () => setFlipP((s) => [s[0], true, s[2]]) });
    // B2
    steps.push({ at: (t += stepGap), act: () => setShowB((s) => [s[0], true, s[2]]) });
    steps.push({ at: (t += flipGap), act: () => setFlipB((s) => [s[0], true, s[2]]) });

    // P3
    if (p3) {
      steps.push({ at: (t += stepGap + 200), act: () => setShowP((s) => [s[0], s[1], true]) });
      steps.push({ at: (t += flipGap), act: () => setFlipP((s) => [s[0], s[1], true]) });
    }
    // B3
    if (b3) {
      steps.push({ at: (t += stepGap + (p3 ? 120 : 200)), act: () => setShowB((s) => [s[0], s[1], true]) });
      steps.push({ at: (t += flipGap), act: () => setFlipB((s) => [s[0], s[1], true]) });
    }

    // Winner glow
    steps.push({ at: (t += 300), act: () => setWinnerGlow(outcome) });

    return steps;
  }, [p3, b3, outcome]);

  useEffect(() => {
    // reset every round/state change
    setShowP([false, false, false]);
    setFlipP([false, false, false]);
    setShowB([false, false, false]);
    setFlipB([false, false, false]);
    setWinnerGlow(null);

    if (phase !== "SETTLED" || playerLabels.length === 0 || bankerLabels.length === 0) return;
    const timers: any[] = [];
    for (const s of script) timers.push(setTimeout(() => s.act(), s.at));
    return () => timers.forEach(clearTimeout);
  }, [phase, playerLabels, bankerLabels, script]);

  return {
    animatedCards: {
      player: playerLabels.map((lbl, i) => ({ label: lbl, show: showP[i], flip: flipP[i], delayMs: 0 })),
      banker: bankerLabels.map((lbl, i) => ({ label: lbl, show: showB[i], flip: flipB[i], delayMs: 0 })),
    },
    winnerGlow,
  };
}

/* =================== Page =================== */
export default function RoomPage() {
  const { room } = useParams<{ room: RoomCode }>();
  const router = useRouter();

  const roomCodeUpper = (String(room || "").toUpperCase() as RoomCode) || "R60";
  const fixedRoom: RoomCode | undefined =
    roomCodeUpper === "R30" || roomCodeUpper === "R60" || roomCodeUpper === "R90" ? roomCodeUpper : undefined;

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 目前時間
  const [nowStr, setNowStr] = useState(formatTime());
  useEffect(() => {
    const t = setInterval(() => setNowStr(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // 金額（籌碼）
  const chipOptions = [50, 100, 200, 500, 1000, 5000];
  const [amount, setAmount] = useState<number>(100);
  const isAmountValid = useMemo(() => Number.isFinite(amount) && amount > 0, [amount]);

  // 我的當局下注彙總
  const [myBets, setMyBets] = useState<Record<BetSide, number>>({
    PLAYER: 0,
    BANKER: 0,
    TIE: 0,
    PLAYER_PAIR: 0,
    BANKER_PAIR: 0,
    ANY_PAIR: 0,
    PERFECT_PAIR: 0,
    BANKER_SUPER_SIX: 0,
  });

  // 正在下注的按鈕
  const [placing, setPlacing] = useState<BetSide | null>(null);

  // 拉 state
  const fetchState = useCallback(async () => {
    try {
      const url = `/api/casino/baccarat/state?room=${roomCodeUpper}`;
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const json: StateResp = await res.json();
      if (!res.ok) throw new Error((json as any)?.error || "載入失敗");
      setData(json);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "連線失敗");
    } finally {
      setLoading(false);
    }
  }, [roomCodeUpper]);

  // 拉 my-bets
  const fetchMyBets = useCallback(async () => {
    try {
      const url = `/api/casino/baccarat/my-bets?room=${roomCodeUpper}`;
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      if (!res.ok) return;
      const json: MyBetsResp = await res.json();
      const agg: Record<BetSide, number> = {
        PLAYER: 0,
        BANKER: 0,
        TIE: 0,
        PLAYER_PAIR: 0,
        BANKER_PAIR: 0,
        ANY_PAIR: 0,
        PERFECT_PAIR: 0,
        BANKER_SUPER_SIX: 0,
      };
      for (const it of json.items) agg[it.side] += it.amount;
      setMyBets(agg);
    } catch {
      /* ignore */
    }
  }, [roomCodeUpper]);

  // 輪詢（state + my-bets）
  useEffect(() => {
    let timer: any;
    const load = async () => {
      await fetchState();
      await fetchMyBets();
    };
    load();
    timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, [fetchState, fetchMyBets]);

  // 倒數本地同步
  const [localSec, setLocalSec] = useState(0);
  useEffect(() => {
    if (!data) return;
    setLocalSec(data.secLeft ?? 0);
  }, [data?.secLeft]);
  useEffect(() => {
    if (localSec <= 0) return;
    const t = setInterval(() => setLocalSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [localSec]);

  async function place(side: BetSide) {
    if (!data) return;
    if (data.phase !== "BETTING") return setErr("目前非下注時間");
    if (!isAmountValid) return setErr("請輸入正確的下注金額");
    if (data.status === "CLOSED") return setErr("該房間已關閉");

    setPlacing(side);
    try {
      const res = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomCodeUpper, side, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "下注失敗");
      setErr("");
      // 立即刷新
      fetchMyBets();
      fetchState();
    } catch (e: any) {
      setErr(e?.message || "下注失敗");
    } finally {
      setPlacing(null);
    }
  }

  const outcomeMark: Outcome = data?.result ? data.result.outcome : null;

  // 取 flags（對子/完美對子/任何對/超6）
  const flags = useMemo(
    () => (data ? deriveFlags(data) : { playerPair: false, bankerPair: false, anyPair: false, perfectPair: false, super6: false }),
    [data?.result, data?.cards]
  );

  // 我的總注與是否贏面（用於金光）
  const myTotal =
    myBets.PLAYER +
    myBets.BANKER +
    myBets.TIE +
    myBets.PLAYER_PAIR +
    myBets.BANKER_PAIR +
    myBets.ANY_PAIR +
    myBets.PERFECT_PAIR +
    myBets.BANKER_SUPER_SIX;

  const isWinnerPred = useMemo(() => {
    if (!data || data.phase !== "SETTLED") return false;
    const o = data.result!.outcome;
    if (o === "PLAYER" && myBets.PLAYER > 0) return true;
    if (o === "BANKER" && myBets.BANKER > 0) return true;
    if (o === "TIE" && myBets.TIE > 0) return true;
    if (flags.playerPair && myBets.PLAYER_PAIR > 0) return true;
    if (flags.bankerPair && myBets.BANKER_PAIR > 0) return true;
    if (flags.anyPair && myBets.ANY_PAIR > 0) return true;
    if (flags.perfectPair && myBets.PERFECT_PAIR > 0) return true;
    if (flags.super6 && myBets.BANKER_SUPER_SIX > 0) return true;
    return false;
  }, [data?.phase, data?.result, flags, myBets]);

  /* ====== Animation binding ====== */
  const playerLabels = (data?.cards?.player ?? []).map(cardToLabel);
  const bankerLabels = (data?.cards?.banker ?? []).map(cardToLabel);
  const { animatedCards, winnerGlow } = useBaccaratReveal({
    phase: data?.phase ?? "BETTING",
    playerLabels,
    bankerLabels,
    outcome: data?.result?.outcome ?? null,
  });

  /* ====== UI Helpers ====== */
  const InfoPill = ({ title, value }: { title: string; value: string | number | undefined }) => (
    <div className="glass px-4 py-2 rounded-xl border border-white/10">
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-lg font-semibold">{value ?? "--"}</div>
    </div>
  );

  const InfoCard = ({
    title,
    value,
    accent,
    wide,
  }: {
    title: string;
    value: string | number;
    accent?: "cyan" | "amber" | "rose" | "violet" | "emerald";
    wide?: boolean;
  }) => {
    const border =
      accent === "cyan"
        ? "border-cyan-400/50"
        : accent === "amber"
        ? "border-amber-300/50"
        : accent === "rose"
        ? "border-rose-400/50"
        : accent === "violet"
        ? "border-violet-400/50"
        : accent === "emerald"
        ? "border-emerald-400/50"
        : "border-white/20";
    return (
      <div className={`glass rounded-xl p-3 ${border} border ${wide ? "col-span-2 md:col-span-2" : ""}`}>
        <div className="text-xs opacity-70">{title}</div>
        <div className="text-lg font-bold mt-1">{value}</div>
      </div>
    );
  };

  const BetButton = ({
    side,
    label,
    rate,
    disabled,
    note,
    theme, // cyan/rose/amber/emerald/violet
    goldPulse,
    onClick,
  }: {
    side: BetSide;
    label: string;
    rate: string;
    theme: "cyan" | "rose" | "amber" | "emerald" | "violet";
    disabled?: boolean;
    note?: number;
    goldPulse?: boolean;
    onClick: () => void;
  }) => {
    const style =
      theme === "cyan"
        ? { bg: "linear-gradient(135deg, rgba(103,232,249,.18), rgba(255,255,255,.06))", border: "rgba(103,232,249,.4)", hover: "hover:border-cyan-300/50" }
        : theme === "amber"
        ? { bg: "linear-gradient(135deg, rgba(253,230,138,.18), rgba(255,255,255,.06))", border: "rgba(253,230,138,.4)", hover: "hover:border-yellow-200/50" }
        : theme === "rose"
        ? { bg: "linear-gradient(135deg, rgba(253,164,175,.18), rgba(255,255,255,.06))", border: "rgba(253,164,175,.4)", hover: "hover:border-rose-300/50" }
        : theme === "emerald"
        ? { bg: "linear-gradient(135deg, rgba(110,231,183,.18), rgba(255,255,255,.06))", border: "rgba(110,231,183,.4)", hover: "hover:border-emerald-300/50" }
        : { bg: "linear-gradient(135deg, rgba(196,181,253,.18), rgba(255,255,255,.06))", border: "rgba(196,181,253,.4)", hover: "hover:border-violet-300/50" };

    const winningGlow = goldPulse ? "shadow-[0_0_32px_rgba(255,215,0,.45)] ring-2 ring-yellow-300/70" : "";

    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl p-5 transition active:scale-95 border ${style.hover} ${winningGlow}`}
        style={{ background: style.bg, borderColor: style.border }}
        title={side}
      >
        <div className="text-2xl font-extrabold">{label}</div>
        <div className="opacity-80 text-sm mt-1">{rate}</div>
        {!!note && <div className="text-xs opacity-80 mt-2">我本局：{note}</div>}
        {/* 金光掃過 */}
        {goldPulse && (
          <div
            className="pointer-events-none absolute -inset-1 animate-[goldSweep_1.2s_ease-in-out]"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,.35) 15%, rgba(255,215,0,.5) 30%, rgba(255,255,255,.25) 45%, transparent 60%)",
              maskImage: "linear-gradient(90deg, transparent 0%, black 25%, black 75%, transparent 100%)",
            }}
          />
        )}
        <div className="sheen absolute inset-0 pointer-events-none" />
      </button>
    );
  };

  const GoldWinOverlay = () =>
    isWinnerPred ? (
      <div
        className="pointer-events-none fixed inset-0 animate-[softGlow_1.2s_ease-in-out] z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,215,0,.16) 0%, rgba(255,215,0,.10) 30%, rgba(255,215,0,.05) 55%, transparent 70%)",
        }}
      />
    ) : null;

  const betButtons: { side: BetSide; label: string; theme: "cyan" | "rose" | "amber" | "emerald" | "violet" }[] = [
    { side: "PLAYER", label: '壓「閒」', theme: "cyan" },
    { side: "TIE", label: '壓「和」', theme: "amber" },
    { side: "BANKER", label: '壓「莊」', theme: "rose" },
    { side: "PLAYER_PAIR", label: "閒對", theme: "emerald" },
    { side: "BANKER_PAIR", label: "莊對", theme: "emerald" },
    { side: "ANY_PAIR", label: "任一對", theme: "violet" },
    { side: "PERFECT_PAIR", label: "完美對", theme: "violet" },
    { side: "BANKER_SUPER_SIX", label: "超級6(莊6)", theme: "rose" },
  ];

  /* ================= Render ================= */
  return (
    <div className="min-h-screen bg-casino-bg text-white relative">
      {/* 贏面金光覆蓋 */}
      <GoldWinOverlay />

      {/* 頂部列 */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn glass tilt" onClick={() => router.push("/casino/baccarat")} title="回百家樂大廳">
            ← 回百家樂大廳
          </button>
          <InfoPill title="房間" value={data?.room?.name || roomCodeUpper} />
          <InfoPill title="局序" value={data ? pad4(data.roundSeq ?? 0) : "--"} />
          <InfoPill title="狀態" value={data ? zhPhase[data.phase] : "載入中"} />
          <InfoPill title="倒數" value={typeof localSec === "number" ? `${localSec}s` : "--"} />
          {data?.status === "CLOSED" && <span className="ml-2 text-rose-300/90">（房間已關閉）</span>}
        </div>

        <div className="flex items-center gap-3">
          <InfoPill title="目前時間" value={nowStr} />
          <InfoPill title="錢包餘額" value={data?.balance ?? "—"} />
        </div>
      </div>

      {/* 內容 */}
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-3 gap-6 pb-16">
        {/* 左：動畫區 + 下注＋結果（佔兩欄） */}
        <div className="lg:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen border border-white/10">
            {/* ======= 動畫區（固定在下注面板上方） ======= */}
            <div className="mb-6 relative rounded-2xl border border-white/10 p-4 bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold">開牌動畫</span>
                <span className="text-sm opacity-80">
                  {data?.phase === "BETTING" ? "等待下注結束…" : data?.phase === "REVEALING" ? "開牌中…" : "本局結果"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* 閒方動畫盒 */}
                <div
                  className={`p-4 rounded-2xl relative border ${
                    (data && (data.result?.outcome === "PLAYER" || winnerGlow === "PLAYER")) ? "border-yellow-400 shadow-[0_0_24px_rgba(255,215,0,.35)] ring-1 ring-yellow-300/50" : "border-white/10"
                  }`}
                  style={{ background: "linear-gradient(135deg, rgba(103,232,249,.10), rgba(255,255,255,.04))" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{`閒方${(data?.result?.outcome === "PLAYER" || winnerGlow === "PLAYER") ? " ★勝" : ""}`}</span>
                    <span className="opacity-80 text-sm">合計 {data?.result?.p ?? 0} 點</span>
                  </div>
                  <div className="flex gap-3 justify-center items-center min-h-[88px]">
                    {animatedCards.player.length > 0 ? (
                      animatedCards.player.map((c, i) => (
                        <PlayingCard key={`p-${i}`} label={c.label} show={c.show} flip={c.flip} delayMs={0} />
                      ))
                    ) : (
                      <>
                        <PlayingCard label="?" show={false} flip={false} />
                        <PlayingCard label="?" show={false} flip={false} />
                        <PlayingCard label="?" show={false} flip={false} />
                      </>
                    )}
                  </div>

                  {/* 閒對 / 完美對 徽章 */}
                  {data?.phase === "SETTLED" && (
                    <div className="absolute left-4 bottom-3 flex gap-2 text-xs">
                      {flags.playerPair && <Badge text="閒對 ✓" />}
                      {flags.perfectPair && <Badge text="完美對 ✓" />}
                    </div>
                  )}
                </div>

                {/* 莊方動畫盒 */}
                <div
                  className={`p-4 rounded-2xl relative border ${
                    (data && (data.result?.outcome === "BANKER" || winnerGlow === "BANKER")) ? "border-yellow-400 shadow-[0_0_24px_rgba(255,215,0,.35)] ring-1 ring-yellow-300/50" : "border-white/10"
                  }`}
                  style={{ background: "linear-gradient(135deg, rgba(253,164,175,.10), rgba(255,255,255,.04))" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{`莊方${(data?.result?.outcome === "BANKER" || winnerGlow === "BANKER") ? " ★勝" : ""}`}</span>
                    <span className="opacity-80 text-sm">合計 {data?.result?.b ?? 0} 點</span>
                  </div>
                  <div className="flex gap-3 justify-center items-center min-h-[88px]">
                    {animatedCards.banker.length > 0 ? (
                      animatedCards.banker.map((c, i) => (
                        <PlayingCard key={`b-${i}`} label={c.label} show={c.show} flip={c.flip} delayMs={0} />
                      ))
                    ) : (
                      <>
                        <PlayingCard label="?" show={false} flip={false} />
                        <PlayingCard label="?" show={false} flip={false} />
                        <PlayingCard label="?" show={false} flip={false} />
                      </>
                    )}
                  </div>

                  {/* 莊對 / 超級6 徽章 */}
                  {data?.phase === "SETTLED" && (
                    <div className="absolute left-4 bottom-3 flex gap-2 text-xs">
                      {flags.bankerPair && <Badge text="莊對 ✓" />}
                      {flags.super6 && <Badge text="超級6 ✓" />}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 text-lg">
                結果：<span className="font-bold">{fmtOutcome(data?.result?.outcome ?? null)}</span>
              </div>

              {/* 本局贏面掃光 */}
              {isWinnerPred && (
                <div
                  className="pointer-events-none absolute -inset-2 animate-[goldSweep_1.2s_ease-in-out]"
                  style={{
                    background:
                      "linear-gradient(120deg, transparent 0%, rgba(255,255,255,.22) 20%, rgba(255,215,0,.35) 40%, rgba(255,255,255,.18) 60%, transparent 80%)",
                  }}
                />
              )}
            </div>

            {/* ======= 下注面板 ======= */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="text-xl font-bold">下注面板</div>
              <div className="text-sm opacity-80">
                單注金額：
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value || 0)))}
                  className="ml-2 w-28 bg-transparent border border-white/20 rounded px-2 py-1 outline-none focus:border-white/40"
                />
                <span className="ml-1">元</span>
              </div>
            </div>

            {/* 籌碼快捷 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {chipOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setAmount(c)}
                  disabled={data?.phase !== "BETTING"}
                  className={`px-3 py-1 rounded-full border transition
                    ${amount === c ? "border-white/70 bg-white/10" : "border-white/20 hover:border-white/40"}`}
                  title={`下注 ${c}`}
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => setAmount((a) => a + 50)}
                disabled={data?.phase !== "BETTING"}
                className="px-3 py-1 rounded-full border border-white/20 hover:border-white/40 transition"
              >
                +50
              </button>
              <button
                onClick={() => setAmount((a) => a + 100)}
                disabled={data?.phase !== "BETTING"}
                className="px-3 py-1 rounded-full border border-white/20 hover:border-white/40 transition"
              >
                +100
              </button>
              <button
                onClick={() => setAmount(0)}
                disabled={data?.phase !== "BETTING"}
                className="px-3 py-1 rounded-full border border-white/20 hover:border-white/40 transition"
              >
                清除
              </button>
            </div>

            {/* 下注資訊小卡 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <InfoCard title="目前選擇" value={`${amount} 元`} />
              <InfoCard title="我壓閒" value={`${myBets.PLAYER} 元`} accent="cyan" />
              <InfoCard title="我壓和" value={`${myBets.TIE} 元`} accent="amber" />
              <InfoCard title="我壓莊" value={`${myBets.BANKER} 元`} accent="rose" />
              <InfoCard title="閒對" value={`${myBets.PLAYER_PAIR} 元`} accent="emerald" />
              <InfoCard title="莊對" value={`${myBets.BANKER_PAIR} 元`} accent="emerald" />
              <InfoCard title="任一對" value={`${myBets.ANY_PAIR} 元`} accent="violet" />
              <InfoCard title="完美對" value={`${myBets.PERFECT_PAIR} 元`} accent="violet" />
              <InfoCard title="超級6" value={`${myBets.BANKER_SUPER_SIX} 元`} accent="rose" />
              <InfoCard title="本局合計" value={`${myTotal} 元`} wide />
            </div>

            {/* 八種注型按鈕 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { side: "PLAYER", label: '壓「閒」', theme: "cyan" },
                { side: "TIE", label: '壓「和」', theme: "amber" },
                { side: "BANKER", label: '壓「莊」', theme: "rose" },
                { side: "PLAYER_PAIR", label: "閒對", theme: "emerald" },
                { side: "BANKER_PAIR", label: "莊對", theme: "emerald" },
                { side: "ANY_PAIR", label: "任一對", theme: "violet" },
                { side: "PERFECT_PAIR", label: "完美對", theme: "violet" },
                { side: "BANKER_SUPER_SIX", label: "超級6(莊6)", theme: "rose" },
              ].map((b) => (
                <BetButton
                  key={b.side}
                  side={b.side as BetSide}
                  label={b.label}
                  rate={PAYOUT_HINT[b.side as BetSide]}
                  theme={b.theme as any}
                  disabled={placing === (b.side as BetSide) || data?.phase !== "BETTING" || !isAmountValid || data?.status === "CLOSED"}
                  note={myBets[b.side as BetSide]}
                  goldPulse={data?.phase === "SETTLED" && (myBets[b.side as BetSide] ?? 0) > 0 && (() => {
                    // 贏面判斷映射
                    if (!data) return false;
                    if (b.side === "PLAYER") return outcomeMark === "PLAYER";
                    if (b.side === "BANKER") return outcomeMark === "BANKER";
                    if (b.side === "TIE") return outcomeMark === "TIE";
                    if (b.side === "PLAYER_PAIR") return flags.playerPair;
                    if (b.side === "BANKER_PAIR") return flags.bankerPair;
                    if (b.side === "ANY_PAIR") return flags.anyPair;
                    if (b.side === "PERFECT_PAIR") return flags.perfectPair;
                    if (b.side === "BANKER_SUPER_SIX") return flags.super6;
                    return false;
                  })()}
                  onClick={() => place(b.side as BetSide)}
                />
              ))}
            </div>

            {err && <div className="text-red-400 text-sm mt-3">{err}</div>}
          </div>
        </div>

        {/* 右：路子/表格/表情路子 + 房內排行榜 */}
        <div>
          {/* 色塊路子 */}
          <div className="glass glow-ring p-6 rounded-2xl mb-6 border border-white/10">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            <div className="grid grid-cols-10 gap-2">
              {(data?.recent || []).map((r, i) => (
                <div
                  key={i}
                  className="h-6 rounded flex items-center justify-center text-[10px]"
                  style={{
                    background:
                      r.outcome === "PLAYER"
                        ? "rgba(103,232,249,.25)"
                        : r.outcome === "BANKER"
                        ? "rgba(253,164,175,.25)"
                        : "rgba(253,230,138,.25)",
                    border:
                      r.outcome === "PLAYER"
                        ? "1px solid rgba(103,232,249,.6)"
                        : r.outcome === "BANKER"
                        ? "1px solid rgba(253,164,175,.6)"
                        : "1px solid rgba(253,230,138,.6)",
                  }}
                  title={`#${pad4(i + 1)}：${zhOutcome[r.outcome]}  閒${r.p} / 莊${r.b}`}
                >
                  {zhOutcome[r.outcome]}
                </div>
              ))}
              {(!data || (data && data.recent.length === 0)) && <div className="opacity-60 text-sm">暫無資料</div>}
            </div>

            {/* 表格 */}
            <div className="mt-4 max-h-64 overflow-auto text-sm">
              <table className="w-full text-left opacity-90">
                <thead className="opacity-70">
                  <tr>
                    <th className="py-1 pr-2">序</th>
                    <th className="py-1 pr-2">結果</th>
                    <th className="py-1 pr-2">閒點</th>
                    <th className="py-1 pr-2">莊點</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent || []).map((r, idx) => (
                    <tr key={`t-${idx}`} className="border-t border-white/10">
                      <td className="py-1 pr-2">{pad4(idx + 1)}</td>
                      <td className="py-1 pr-2">{zhOutcome[r.outcome]}</td>
                      <td className="py-1 pr-2">{r.p}</td>
                      <td className="py-1 pr-2">{r.b}</td>
                    </tr>
                  ))}
                  {(!data || (data && data.recent.length === 0)) && (
                    <tr>
                      <td colSpan={4} className="py-2 opacity-60">
                        暫無資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 表情路子（簡化 6x6） */}
          <div className="glass glow-ring p-6 rounded-2xl mb-6 border border-white/10">
            <div className="text-xl font-bold mb-4">表情路子</div>
            <div className="grid grid-cols-6 gap-3">
              {(data?.recent || []).slice(0, 36).map((r, i) => (
                <div
                  key={`emo-${i}`}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-xs"
                  style={{
                    background:
                      r.outcome === "PLAYER"
                        ? "rgba(103,232,249,.22)"
                        : r.outcome === "BANKER"
                        ? "rgba(253,164,175,.22)"
                        : "rgba(253,230,138,.22)",
                    border:
                      r.outcome === "PLAYER"
                        ? "1px solid rgba(103,232,249,.6)"
                        : r.outcome === "BANKER"
                        ? "1px solid rgba(253,164,175,.6)"
                        : "1px solid rgba(253,230,138,.6)",
                  }}
                  title={`${zhOutcome[r.outcome]} 閒${r.p} / 莊${r.b}`}
                >
                  {r.outcome === "PLAYER" ? "🔵" : r.outcome === "BANKER" ? "🔴" : "🟡"}
                </div>
              ))}
              {(!data || (data && data.recent.length === 0)) &&
                Array.from({ length: 12 }).map((_, i) => (
                  <div key={`ghost-${i}`} className="w-8 h-8 rounded-md bg-white/5 border border-white/10" />
                ))}
            </div>
          </div>

          {/* 房內排行榜（固定房，不顯示房間選單） */}
          {fixedRoom && <Leaderboard fixedRoom={fixedRoom} showRoomSelector={false} />}
        </div>
      </div>

      {/* 動畫 keyframes（限本頁） */}
      <style jsx global>{`
        @keyframes goldSweep {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          40% {
            opacity: 0.9;
          }
          100% {
            transform: translateX(120%);
            opacity: 0;
          }
        }
        @keyframes softGlow {
          0% {
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        .rotate-y-0 {
          transform: rotateY(0deg);
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}

/* ---------- 小徽章 ---------- */
function Badge({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border border-yellow-300/60 bg-yellow-300/15 shadow-[0_0_12px_rgba(255,215,0,.35)]"
      title={text}
    >
      ✨ {text}
    </span>
  );
}
