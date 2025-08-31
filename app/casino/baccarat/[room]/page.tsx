// app/casino/baccarat/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Leaderboard from "@/components/Leaderboard"; // ⭐ 新增：排行榜

type Outcome = "PLAYER" | "BANKER" | "TIE" | null;
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: { code: string; name: string; durationSeconds: number };
  day: string;
  roundId: string;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Outcome; p: number | null; b: number | null };
  cards?: { player: any[]; banker: any[] };
  myBets: Record<string, number>;
  balance: number | null; // ⭐ 從 state API 帶回錢包
  recent: { roundSeq: number; outcome: Exclude<Outcome, null>; p: number; b: number }[];
};

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

function fmtOutcome(o: Outcome) {
  return o ? zhOutcome[o] : "—";
}
function pad4(n: number) {
  return n.toString().padStart(4, "0");
}

/** 把 {rank,suit} 或字串卡面轉成 "Q♥" 顯示（安全） */
function cardToLabel(c: any): string {
  if (c == null) return "?";
  if (typeof c === "string") return c;

  const rankMap: Record<string | number, string> = {
    1: "A", 11: "J", 12: "Q", 13: "K",
    A: "A", J: "J", Q: "Q", K: "K",
    a: "A", j: "J", q: "Q", k: "K",
  };
  const suitMap: Record<string | number, string> = {
    S: "♠", s: "♠", 0: "♠",
    H: "♥", h: "♥", 1: "♥",
    D: "♦", d: "♦", 2: "♦",
    C: "♣", c: "♣", 3: "♣",
    SPADE: "♠", HEART: "♥", DIAMOND: "♦", CLUB: "♣",
  };

  let r = (c.rank ?? c.value ?? "?") as string | number;
  let s = (c.suit ?? c.s ?? "?") as string | number;

  const rStr =
    typeof r === "number" ? rankMap[r] ?? String(r) : rankMap[r] ?? String(r).toUpperCase();
  const sStr = suitMap[s] ?? suitMap[String(s).toUpperCase()] ?? "■";

  return `${rStr}${sStr}`;
}

function formatTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function RoomPage() {
  const { room } = useParams<{ room: string }>();
  const router = useRouter();

  // ⭐ 驗證房間代碼，提供給排行榜 fixedRoom
  const roomCodeUpper = useMemo(() => String(room || "").toUpperCase(), [room]);
  const fixedRoom = useMemo(
    () =>
      roomCodeUpper === "R30" || roomCodeUpper === "R60" || roomCodeUpper === "R90"
        ? (roomCodeUpper as "R30" | "R60" | "R90")
        : undefined,
    [roomCodeUpper]
  );

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<null | "PLAYER" | "BANKER" | "TIE">(null);
  const [err, setErr] = useState("");

  // 目前時間
  const [nowStr, setNowStr] = useState(formatTime());
  useEffect(() => {
    const t = setInterval(() => setNowStr(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // 籌碼/金額
  const chipOptions = [50, 100, 500, 1000];
  const [amount, setAmount] = useState<number>(100);
  const isAmountValid = useMemo(() => Number.isFinite(amount) && amount > 0, [amount]);

  // 輪詢 state（包含 balance）
  useEffect(() => {
    let timer: any;
    let mounted = true;

    async function load() {
      try {
        const url = `/api/casino/baccarat/state?room=${room}`;
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "載入失敗");
        if (mounted) {
          setData(json);
          setErr("");
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || "連線失敗");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    timer = setInterval(load, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [room]);

  // 倒數本地同步
  const [localSec, setLocalSec] = useState(0);
  useEffect(() => {
    if (!data) return;
    setLocalSec(data.secLeft);
  }, [data?.secLeft]);
  useEffect(() => {
    if (localSec <= 0) return;
    const t = setInterval(() => setLocalSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [localSec]);

  async function place(side: "PLAYER" | "BANKER" | "TIE") {
    if (!data) return;
    if (data.phase !== "BETTING") return setErr("目前非下注時間");
    if (!isAmountValid) return setErr("請輸入正確的下注金額");

    setPlacing(side);
    try {
      const res = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: data.room.code, side, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "下注失敗");
      setErr("");

      // 下完注後，等下一輪 state 輪詢會自動更新 balance/myBets/倒數等
    } catch (e: any) {
      setErr(e?.message || "下注失敗");
    } finally {
      setPlacing(null);
    }
  }

  const outcomeMark = useMemo(() => (data?.result ? data.result.outcome : null), [data?.result]);

  // 下注資訊
  const myBetPlayer = data?.myBets?.PLAYER ?? 0;
  const myBetTie = data?.myBets?.TIE ?? 0;
  const myBetBanker = data?.myBets?.BANKER ?? 0;
  const myBetTotal = myBetPlayer + myBetTie + myBetBanker;

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* 頂部列 */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn glass tilt" onClick={() => router.push("/lobby")} title="回大廳">
            ← 回大廳
          </button>

          <InfoPill title="房間" value={data?.room.name || String(room)} />
          <InfoPill title="局序" value={data ? pad4(data.roundSeq) : "--"} />
          <InfoPill title="狀態" value={data ? zhPhase[data.phase] : "載入中"} />
          <InfoPill title="倒數" value={typeof localSec === "number" ? `${localSec}s` : "--"} />
        </div>

        {/* 目前時間 + 錢包餘額（來自 state API） */}
        <div className="flex items-center gap-3">
          <InfoPill title="目前時間" value={nowStr} />
          <InfoPill title="錢包餘額" value={data?.balance ?? "—"} />
        </div>
      </div>

      {/* 內容 */}
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-3 gap-6 pb-16">
        {/* 左：下注＋結果（佔兩欄） */}
        <div className="lg:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen">
            {/* 金額列 */}
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
              {[50, 100, 500, 1000].map((c) => (
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
              <InfoCard title="我壓閒" value={`${myBetPlayer} 元`} color="cyan" />
              <InfoCard title="我壓和" value={`${myBetTie} 元`} color="amber" />
              <InfoCard title="我壓莊" value={`${myBetBanker} 元`} color="rose" />
              <InfoCard title="本局合計" value={`${myBetTotal} 元`} wide />
            </div>

            {/* 壓 閒/和/莊 */}
            <div className="grid grid-cols-3 gap-4">
              <BetButton
                label='壓「閒」'
                rate="1 : 1"
                disabled={placing === "PLAYER" || data?.phase !== "BETTING" || !isAmountValid}
                theme="cyan"
                note={data?.myBets?.PLAYER}
                onClick={() => place("PLAYER")}
              />
              <BetButton
                label='壓「和」'
                rate="1 : 8"
                disabled={placing === "TIE" || data?.phase !== "BETTING" || !isAmountValid}
                theme="amber"
                note={data?.myBets?.TIE}
                onClick={() => place("TIE")}
              />
              <BetButton
                label='壓「莊」'
                rate="1 : 0.95"
                disabled={placing === "BANKER" || data?.phase !== "BETTING" || !isAmountValid}
                theme="rose"
                note={data?.myBets?.BANKER}
                onClick={() => place("BANKER")}
              />
            </div>

            {/* 開牌／結果 */}
            <div className="mt-8">
              <div className="text-sm opacity-80 mb-2">本局結果</div>

              <div className="grid grid-cols-2 gap-6">
                <CardList
                  label="閒方"
                  cards={data?.cards?.player ?? []}
                  total={data?.result?.p ?? 0}
                  outcome={outcomeMark}
                  isWinner={outcomeMark === "PLAYER"}
                  side="PLAYER"
                />
                <CardList
                  label="莊方"
                  cards={data?.cards?.banker ?? []}
                  total={data?.result?.b ?? 0}
                  outcome={outcomeMark}
                  isWinner={outcomeMark === "BANKER"}
                  side="BANKER"
                />
              </div>

              <div className="mt-3 text-lg">
                結果：<span className="font-bold">{fmtOutcome(outcomeMark)}</span>
              </div>

              {data?.phase === "BETTING" && (
                <div className="mt-3 opacity-80">等待下注結束後將自動開牌…</div>
              )}

              {err && <div className="text-red-400 text-sm mt-3">{err}</div>}
            </div>
          </div>
        </div>

        {/* 右：路子/表格/表情路子 + ⭐ 該房排行榜 */}
        <div>
          {/* 色塊路子 */}
          <div className="glass glow-ring p-6 rounded-2xl mb-6">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            <div className="grid grid-cols-10 gap-2">
              {(data?.recent || []).map((r) => (
                <div
                  key={r.roundSeq}
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
                  title={`#${pad4(r.roundSeq)}：${fmtOutcome(r.outcome)}  閒${r.p} / 莊${r.b}`}
                >
                  {zhOutcome[r.outcome]}
                </div>
              ))}
              {(!data || (data && data.recent.length === 0)) && (
                <div className="opacity-60 text-sm">暫無資料</div>
              )}
            </div>

            {/* 表格 */}
            <div className="mt-4 max-h-64 overflow-auto text-sm">
              <table className="w-full text-left opacity-90">
                <thead className="opacity-70">
                  <tr>
                    <th className="py-1 pr-2">局序</th>
                    <th className="py-1 pr-2">結果</th>
                    <th className="py-1 pr-2">閒點</th>
                    <th className="py-1 pr-2">莊點</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent || []).map((r) => (
                    <tr key={`t-${r.roundSeq}`} className="border-t border-white/10">
                      <td className="py-1 pr-2">{pad4(r.roundSeq)}</td>
                      <td className="py-1 pr-2">{fmtOutcome(r.outcome)}</td>
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
          <div className="glass glow-ring p-6 rounded-2xl mb-6">
            <div className="text-xl font-bold mb-4">表情路子</div>
            <div className="grid grid-cols-6 gap-3">
              {(data?.recent || []).slice(0, 36).map((r) => (
                <div
                  key={`emo-${r.roundSeq}`}
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
                  title={`#${pad4(r.roundSeq)}：${fmtOutcome(r.outcome)}  閒${r.p} / 莊${r.b}`}
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

          {/* ⭐ 房內排行榜（固定房，不顯示房間選單） */}
          {fixedRoom && (
            <Leaderboard fixedRoom={fixedRoom} showRoomSelector={false} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 小元件 ---------- */

function InfoPill({ title, value }: { title: string; value: string | number | undefined }) {
  return (
    <div className="glass px-4 py-2 rounded-xl">
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-lg font-semibold">{value ?? "--"}</div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  color,
  wide,
}: {
  title: string;
  value: string | number;
  color?: "cyan" | "amber" | "rose";
  wide?: boolean;
}) {
  const border =
    color === "cyan"
      ? "border-cyan-400/50"
      : color === "amber"
      ? "border-amber-300/50"
      : color === "rose"
      ? "border-rose-400/50"
      : "border-white/20";

  return (
    <div className={`glass rounded-xl p-3 ${border} border ${wide ? "col-span-2 md:col-span-2" : ""}`}>
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function BetButton({
  label,
  rate,
  theme, // 'cyan' | 'amber' | 'rose'
  disabled,
  note,
  onClick,
}: {
  label: string;
  rate: string;
  theme: "cyan" | "amber" | "rose";
  disabled?: boolean;
  note?: number;
  onClick: () => void;
}) {
  const style =
    theme === "cyan"
      ? {
          bg: "linear-gradient(135deg, rgba(103,232,249,.18), rgba(255,255,255,.06))",
          border: "rgba(103,232,249,.4)",
          hover: "hover:border-cyan-300/50",
        }
      : theme === "amber"
      ? {
          bg: "linear-gradient(135deg, rgba(253,230,138,.18), rgba(255,255,255,.06))",
          border: "rgba(253,230,138,.4)",
          hover: "hover:border-yellow-200/50",
        }
      : {
          bg: "linear-gradient(135deg, rgba(253,164,175,.18), rgba(255,255,255,.06))",
          border: "rgba(253,164,175,.4)",
          hover: "hover:border-rose-300/50",
        };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 transition active:scale-95 border ${style.hover}`}
      style={{ background: style.bg, borderColor: style.border }}
    >
      <div className="text-2xl font-extrabold">{label}</div>
      <div className="opacity-80 text-sm mt-1">{rate}</div>
      {!!note && <div className="text-xs opacity-80 mt-2">我本局：{note}</div>}
      <div className="sheen absolute inset-0 pointer-events-none" />
    </button>
  );
}

function GhostCard() {
  return (
    <div className="w-14 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg opacity-60">
      ?
    </div>
  );
}

function CardList({
  label,
  cards,
  total,
  outcome,
  isWinner,
  side,
}: {
  label: string;
  cards: any[];
  total: number;
  outcome: Outcome;
  isWinner: boolean;
  side: "PLAYER" | "BANKER";
}) {
  return (
    <div
      className={`p-4 rounded-2xl glass relative ${
        isWinner ? "border-2 border-yellow-400 shadow-[0_0_24px_rgba(255,215,0,.35)]" : "border border-white/10"
      }`}
      style={{
        background:
          side === "PLAYER"
            ? "linear-gradient(135deg, rgba(103,232,249,.10), rgba(255,255,255,.04))"
            : "linear-gradient(135deg, rgba(253,164,175,.10), rgba(255,255,255,.04))",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold">
          {label}
          {isWinner && " ★勝"}
        </span>
        <span className="opacity-80 text-sm">合計 {total ?? 0} 點</span>
      </div>

      <div className="flex gap-3 justify-center items-center min-h-[88px]">
        {cards && cards.length > 0 ? (
          cards.map((raw, i) => {
            const lbl = cardToLabel(raw);
            return (
              <div
                key={`${lbl}-${i}`}
                className="w-14 h-20 rounded-xl bg-white/10 border border-white/20 
                           flex items-center justify-center text-lg font-bold
                           animate-[flipIn_.6s_ease_forwards]"
                style={{ animationDelay: `${i * 0.28}s` }}
                title={lbl}
              >
                {lbl}
              </div>
            );
          })
        ) : (
          <>
            <GhostCard />
            <GhostCard />
            <GhostCard />
          </>
        )}
      </div>
    </div>
  );
}
