// app/casino/baccarat/rooms/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";

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

type Card = { rank: number; suit: number };

type StateResp = {
  ok: boolean;
  room: { code: RoomCode; name: string; durationSeconds: number };
  day: string;
  roundId: string | null;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Exclude<Outcome, null>; p: number; b: number };
  cards?: { player: Card[]; banker: Card[] };
  myBets: Partial<Record<BetSide, number>>;
  balance: number | null;
  recent: { roundSeq: number; outcome: Exclude<Outcome, null>; p: number; b: number }[];
};

type MyBetsResp = { items: { side: BetSide; amount: number }[] };

const zhPhase: Record<Phase, string> = { BETTING: "下注中", REVEALING: "開牌中", SETTLED: "已結算" };
const zhOutcome: Record<Exclude<Outcome, null>, string> = { PLAYER: "閒", BANKER: "莊", TIE: "和" };
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

const pad4 = (n: number) => n.toString().padStart(4, "0");
const formatTime = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

const suitIcon = (s: number) => ["♠", "♥", "♦", "♣"][s] || "■";
const rankIcon = (r: number) => (r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r));
const cardToLabel = (c: Card) => `${rankIcon(c.rank)}${suitIcon(c.suit)}`;

function deriveFlags(cards?: { player: Card[]; banker: Card[] }, result?: StateResp["result"] | null) {
  const pc = cards?.player ?? [];
  const bc = cards?.banker ?? [];
  const sameRank = (a?: Card, b?: Card) => !!(a && b && a.rank === b.rank);
  const sameSuit = (a?: Card, b?: Card) => !!(a && b && a.suit === b.suit);
  const playerPair = sameRank(pc[0], pc[1]);
  const bankerPair = sameRank(bc[0], bc[1]);
  const perfectPair = (playerPair && sameSuit(pc[0], pc[1])) || (bankerPair && sameSuit(bc[0], bc[1]));
  const anyPair = playerPair || bankerPair;
  const super6 = result?.outcome === "BANKER" && result?.b === 6;
  return { playerPair, bankerPair, anyPair, perfectPair, super6 };
}

/* ===== 翻牌動畫卡片 ===== */
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
    <div className={`bk-card ${show ? "show" : ""} ${flip ? "flip" : ""}`} style={{ transitionDelay: `${delayMs}ms` }} title={label}>
      <div className="bk-card-back" />
      <div className="bk-card-front">
        <span className="bk-card-text">{label}</span>
      </div>
    </div>
  );
}

/* ===== 翻牌腳本（沿用你的時序，收斂為 REVEALING/SETTLED 時觸發） ===== */
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
    const stepGap = 240;
    const flipGap = 180;

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
    // P3?
    if (p3) {
      steps.push({ at: (t += stepGap + 260), act: () => setShowP((s) => [s[0], s[1], true]) });
      steps.push({ at: (t += flipGap), act: () => setFlipP((s) => [s[0], s[1], true]) });
    }
    // B3?
    if (b3) {
      steps.push({ at: (t += stepGap + (p3 ? 200 : 260)), act: () => setShowB((s) => [s[0], s[1], true]) });
      steps.push({ at: (t += flipGap), act: () => setFlipB((s) => [s[0], s[1], true]) });
    }

    // 勝方金框閃
    steps.push({ at: (t += 420), act: () => setWinnerGlow(outcome) });
    return steps;
  }, [p3, b3, outcome]);

  useEffect(() => {
    // 每局重置
    setShowP([false, false, false]);
    setFlipP([false, false, false]);
    setShowB([false, false, false]);
    setFlipB([false, false, false]);
    setWinnerGlow(null);

    // 只有在 REVEALING / SETTLED 時才播放腳本（避免下注中跳動畫）
    if ((phase !== "REVEALING" && phase !== "SETTLED") || playerLabels.length === 0 || bankerLabels.length === 0) return;
    const timers: any[] = [];
    for (const s of script) timers.push(setTimeout(() => s.act(), s.at));
    return () => timers.forEach(clearTimeout);
  }, [phase, playerLabels, bankerLabels, script]);

  return {
    animatedCards: {
      player: playerLabels.map((lbl, i) => ({ label: lbl, show: showP[i], flip: flipP[i] })),
      banker: bankerLabels.map((lbl, i) => ({ label: lbl, show: showB[i], flip: flipB[i] })),
    },
    winnerGlow,
  };
}

export default function RoomPage() {
  const { room } = useParams<{ room: RoomCode }>();
  const router = useRouter();
  const roomCodeUpper = (String(room || "").toUpperCase() as RoomCode) || "R60";
  const fixedRoom = (["R30", "R60", "R90"] as RoomCode[]).includes(roomCodeUpper) ? roomCodeUpper : undefined;

  const [data, setData] = useState<StateResp | null>(null);
  const [err, setErr] = useState("");

  // 時鐘
  const [nowStr, setNowStr] = useState(formatTime());
  useEffect(() => {
    const t = setInterval(() => setNowStr(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // 本地下注額
  const [amount, setAmount] = useState<number>(100);
  const isAmountValid = Number.isFinite(amount) && amount > 0;

  // 我的本局下注彙總（面板顯示用）
  const emptyAgg: Record<BetSide, number> = {
    PLAYER: 0,
    BANKER: 0,
    TIE: 0,
    PLAYER_PAIR: 0,
    BANKER_PAIR: 0,
    ANY_PAIR: 0,
    PERFECT_PAIR: 0,
    BANKER_SUPER_SIX: 0,
  };
  const [myBets, setMyBets] = useState<Record<BetSide, number>>(emptyAgg);
  const [placing, setPlacing] = useState<BetSide | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${roomCodeUpper}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json: StateResp = await res.json();
      if (!res.ok || !json?.ok) throw new Error((json as any)?.error || "載入失敗");
      setData(json);
      setErr("");

      // 已結算 → 清空本地下注合計（視覺）
      if (json.phase === "SETTLED") {
        setMyBets({ ...emptyAgg });
      }
    } catch (e: any) {
      setErr(e?.message || "連線失敗");
    }
  }, [roomCodeUpper]);

  const fetchMyBets = useCallback(async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/my-bets?room=${roomCodeUpper}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return;
      const json: MyBetsResp = await res.json();
      const agg = { ...emptyAgg };
      for (const it of json.items) agg[it.side] += it.amount;
      setMyBets(agg);
    } catch {}
  }, [roomCodeUpper]);

  useEffect(() => {
    const load = async () => {
      await fetchState();
      await fetchMyBets();
    };
    load();
    const timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, [fetchState, fetchMyBets]);

  // 本地倒數（畫面同步）
  const [localSec, setLocalSec] = useState(0);
  useEffect(() => {
    if (data) setLocalSec(data.secLeft ?? 0);
  }, [data?.secLeft]);
  useEffect(() => {
    if (localSec <= 0) return;
    const t = setInterval(() => setLocalSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [localSec]);

  // 下單
  async function place(side: BetSide) {
    if (!data) return;
    if (data.phase !== "BETTING") return setErr("目前非下注時間");
    if (!isAmountValid) return setErr("請輸入正確的下注金額");
    if (!data.roundId) return setErr("本局未建立，稍候再試");

    setPlacing(side);
    try {
      const res = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomCodeUpper,
          roundId: data.roundId,
          bets: [{ side, amount }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "下注失敗");

      setErr("");
      await fetchMyBets();
      await fetchState();
    } catch (e: any) {
      setErr(e?.message || "下注失敗");
    } finally {
      setPlacing(null);
    }
  }

  // 旗標與動畫
  const flags = useMemo(() => deriveFlags(data?.cards, data?.result), [data?.cards, data?.result]);
  const outcomeMark: Outcome = data?.result ? data.result.outcome : null;
  const playerLabels = (data?.cards?.player ?? []).map(cardToLabel);
  const bankerLabels = (data?.cards?.banker ?? []).map(cardToLabel);
  const { animatedCards, winnerGlow } = useBaccaratReveal({
    phase: data?.phase ?? "BETTING",
    playerLabels,
    bankerLabels,
    outcome: data?.result?.outcome ?? null,
  });
  const myTotal = (Object.keys(myBets) as BetSide[]).reduce((s, k) => s + (myBets[k] || 0), 0);

  // 贏家金框閃三下（下注面板的該按鈕）
  const goldPulseSide: BetSide | null = useMemo(() => {
    if (!data || data.phase !== "SETTLED" || !outcomeMark) return null;
    if (outcomeMark === "PLAYER" && myBets.PLAYER > 0) return "PLAYER";
    if (outcomeMark === "BANKER" && myBets.BANKER > 0) return "BANKER";
    if (outcomeMark === "TIE" && myBets.TIE > 0) return "TIE";
    if (flags.playerPair && myBets.PLAYER_PAIR > 0) return "PLAYER_PAIR";
    if (flags.bankerPair && myBets.BANKER_PAIR > 0) return "BANKER_PAIR";
    if (flags.anyPair && myBets.ANY_PAIR > 0) return "ANY_PAIR";
    if (flags.perfectPair && myBets.PERFECT_PAIR > 0) return "PERFECT_PAIR";
    if (flags.super6 && myBets.BANKER_SUPER_SIX > 0) return "BANKER_SUPER_SIX";
    return null;
  }, [data?.phase, outcomeMark, flags, myBets]);

  if (!data) {
    return (
      <main className="bk-room-wrap">
        <div className="text-white p-10">
          載入中… {err && <span className="ml-2 text-rose-300">{err}</span>}
        </div>
        <link rel="stylesheet" href="/styles/baccarat/baccarat-room.css" />
      </main>
    );
  }

  return (
    <main className="bk-room-wrap text-white">
      {/* Header */}
      <header className="bk-header">
        <div className="left">
          <button className="bk-btn" onClick={() => router.push("/casino/baccarat")} title="回百家樂大廳">
            ← 回百家樂大廳
          </button>
          <span className="bk-room-name">{data.room.name}</span>
          <span className="bk-room-seq"># {pad4(data.roundSeq)}</span>
        </div>
        <div className="center">{zhPhase[data.phase]}</div>
        <div className="right">
          <span>倒數：{typeof localSec === "number" ? `${localSec}s` : "--"}</span>
          <span className="mx-3">時間：{nowStr}</span>
          <span>餘額：{data.balance ?? "—"}</span>
        </div>
      </header>

      {/* Content */}
      <section className="bk-content">
        {/* 左：動畫 + 下注 */}
        <div className="bk-left">
          <div className="bk-panel">
            {/* 開牌動畫 */}
            <div className="bk-reveal">
              <div className="bk-reveal-head">
                <span className="title">開牌動畫</span>
                <span className="sub">
                  {data.phase === "BETTING" ? "等待下注結束…" : data.phase === "REVEALING" ? "開牌中…" : "本局結果"}
                </span>
              </div>

              <div className="bk-reveal-grid">
                {/* 閒 */}
                <div className={`side side-player ${data && (data.result?.outcome === "PLAYER" || winnerGlow === "PLAYER") ? "win" : ""}`}>
                  <div className="side-head">
                    <span className="name">閒方{data?.result?.outcome === "PLAYER" || winnerGlow === "PLAYER" ? " ★勝" : ""}</span>
                    <span className="pts">合計 {data?.result?.p ?? 0} 點</span>
                  </div>
                  <div className="cards">
                    {animatedCards.player.length > 0
                      ? animatedCards.player.map((c, i) => <PlayingCard key={`p-${i}`} label={c.label} show={c.show} flip={c.flip} />)
                      : [0, 1, 2].map((i) => <PlayingCard key={`p-skel-${i}`} label="?" show={false} flip={false} />)}
                  </div>
                </div>

                {/* 莊 */}
                <div className={`side side-banker ${data && (data.result?.outcome === "BANKER" || winnerGlow === "BANKER") ? "win" : ""}`}>
                  <div className="side-head">
                    <span className="name">莊方{data?.result?.outcome === "BANKER" || winnerGlow === "BANKER" ? " ★勝" : ""}</span>
                    <span className="pts">合計 {data?.result?.b ?? 0} 點</span>
                  </div>
                  <div className="cards">
                    {animatedCards.banker.length > 0
                      ? animatedCards.banker.map((c, i) => <PlayingCard key={`b-${i}`} label={c.label} show={c.show} flip={c.flip} />)
                      : [0, 1, 2].map((i) => <PlayingCard key={`b-skel-${i}`} label="?" show={false} flip={false} />)}
                  </div>
                </div>
              </div>

              <div className="bk-reveal-result">
                結果：<b>{data.result ? zhOutcome[data.result.outcome] : "—"}</b>
              </div>
            </div>

            {/* 下注面板 */}
            <div className="bk-bet-panel">
              <div className="panel-head">
                <div className="title">下注面板</div>
                <div className="amount">
                  單注金額：
                  <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value || 0)))} />
                  <span>元</span>
                </div>
              </div>

              <div className="chips">
                {[50, 100, 200, 500, 1000, 5000].map((c) => (
                  <button key={c} onClick={() => setAmount(c)} disabled={data?.phase !== "BETTING"} className={amount === c ? "active" : ""}>
                    {c}
                  </button>
                ))}
                <button onClick={() => setAmount((a) => a + 50)} disabled={data?.phase !== "BETTING"}>
                  +50
                </button>
                <button onClick={() => setAmount((a) => a + 100)} disabled={data?.phase !== "BETTING"}>
                  +100
                </button>
                <button onClick={() => setAmount(0)} disabled={data?.phase !== "BETTING"}>
                  清除
                </button>
              </div>

              {/* 我的下注彙總卡（結算後自動清空） */}
              <div className="mybets grid">
                <div className="info-card">
                  <div className="k">目前選擇</div>
                  <div className="v">{amount} 元</div>
                </div>
                <div className="info-card ac-cyan">
                  <div className="k">我壓閒</div>
                  <div className="v">{myBets.PLAYER} 元</div>
                </div>
                <div className="info-card ac-amber">
                  <div className="k">我壓和</div>
                  <div className="v">{myBets.TIE} 元</div>
                </div>
                <div className="info-card ac-rose">
                  <div className="k">我壓莊</div>
                  <div className="v">{myBets.BANKER} 元</div>
                </div>
                <div className="info-card ac-emerald">
                  <div className="k">閒對</div>
                  <div className="v">{myBets.PLAYER_PAIR} 元</div>
                </div>
                <div className="info-card ac-emerald">
                  <div className="k">莊對</div>
                  <div className="v">{myBets.BANKER_PAIR} 元</div>
                </div>
                <div className="info-card ac-violet">
                  <div className="k">任一對</div>
                  <div className="v">{myBets.ANY_PAIR} 元</div>
                </div>
                <div className="info-card ac-violet">
                  <div className="k">完美對</div>
                  <div className="v">{myBets.PERFECT_PAIR} 元</div>
                </div>
                <div className="info-card ac-rose">
                  <div className="k">超級6</div>
                  <div className="v">{myBets.BANKER_SUPER_SIX} 元</div>
                </div>
                <div className="info-card wide">
                  <div className="k">本局合計</div>
                  <div className="v">{myTotal} 元</div>
                </div>
              </div>

              {/* 八種注型 */}
              <div className="bet-grid">
                {(
                  [
                    { side: "PLAYER", label: '壓「閒」', theme: "cyan" },
                    { side: "TIE", label: '壓「和」', theme: "amber" },
                    { side: "BANKER", label: '壓「莊」', theme: "rose" },
                    { side: "PLAYER_PAIR", label: "閒對", theme: "emerald" },
                    { side: "BANKER_PAIR", label: "莊對", theme: "emerald" },
                    { side: "ANY_PAIR", label: "任一對", theme: "violet" },
                    { side: "PERFECT_PAIR", label: "完美對", theme: "violet" },
                    { side: "BANKER_SUPER_SIX", label: "超級6(莊6)", theme: "rose" },
                  ] as const
                ).map((b) => {
                  const isWinnerBtn = goldPulseSide === (b.side as BetSide);
                  return (
                    <button
                      key={b.side}
                      data-theme={b.theme}
                      className={`bet-btn ${isWinnerBtn ? "gold-pulse-3" : ""}`}
                      disabled={placing === (b.side as BetSide) || data?.phase !== "BETTING" || !isAmountValid}
                      title={PAYOUT_HINT[b.side as BetSide]}
                      onClick={() => place(b.side as BetSide)}
                    >
                      <div className="bet-label">{b.label}</div>
                      <div className="bet-rate">{PAYOUT_HINT[b.side as BetSide]}</div>
                      {!!myBets[b.side as BetSide] && <div className="bet-note">我本局：{myBets[b.side as BetSide]}</div>}
                    </button>
                  );
                })}
              </div>

              {err && <div className="err">{err}</div>}
            </div>
          </div>
        </div>

        {/* 右：路子 + 排行榜 */}
        <div className="bk-right">
          <div className="bk-panel">
            <div className="title">路子（近 20 局）</div>

            <div className="streak-grid">
              {(data?.recent || []).map((r, i) => (
                <div
                  key={i}
                  className={`streak ${r.outcome === "PLAYER" ? "p" : r.outcome === "BANKER" ? "b" : "t"}`}
                  title={`#${pad4(r.roundSeq)}：${zhOutcome[r.outcome]}  閒${r.p} / 莊${r.b}`}
                >
                  {zhOutcome[r.outcome]}
                </div>
              ))}
              {(!data || (data && data.recent.length === 0)) && <div className="muted">暫無資料</div>}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>局序</th>
                    <th>結果</th>
                    <th>閒點</th>
                    <th>莊點</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent || []).map((r) => (
                    <tr key={`t-${r.roundSeq}`}>
                      <td>{pad4(r.roundSeq)}</td>
                      <td>{zhOutcome[r.outcome]}</td>
                      <td>{r.p}</td>
                      <td>{r.b}</td>
                    </tr>
                  ))}
                  {(!data || (data && data.recent.length === 0)) && (
                    <tr>
                      <td colSpan={4} className="muted">
                        暫無資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {fixedRoom && <Leaderboard fixedRoom={fixedRoom} showRoomSelector={false} />}
        </div>
      </section>

      <link rel="stylesheet" href="/styles/baccarat/baccarat-room.css" />
    </main>
  );
}
