// app/casino/baccarat/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CardFlip from "@/components/CardFlip";

type Outcome = "PLAYER" | "BANKER" | "TIE" | null;
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: { code: string; name: string; durationSeconds: number };
  day: string;
  roundId: string;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | {
    outcome: Outcome;
    p: number | null;
    b: number | null;
    playerCards?: { rank: string; suit: string }[];
    bankerCards?: { rank: string; suit: string }[];
  };
  // 舊欄位（相容）
  cards?: { player: { rank: string; suit: string }[]; banker: { rank: string; suit: string }[] };
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
};

const zhPhase: Record<Phase, string> = {
  BETTING: "下注中",
  REVEALING: "開牌中",
  SETTLED: "已結算",
};
const zhOutcome: Record<NonNullable<Outcome>, string> = {
  PLAYER: "閒",
  BANKER: "莊",
  TIE: "和",
};
function fmtOutcome(o: Outcome) {
  if (!o) return "—";
  return zhOutcome[o];
}
function pad4(n: number) {
  return n.toString().padStart(4, "0");
}

export default function RoomPage() {
  const { room } = useParams<{ room: string }>();
  const router = useRouter();

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<null | "PLAYER" | "BANKER" | "TIE">(null);
  const [err, setErr] = useState<string>("");

  // 下注金額
  const chipOptions = [50, 100, 500, 1000];
  const [amount, setAmount] = useState<number>(100);
  const isAmountValid = useMemo(() => Number.isFinite(amount) && amount > 0, [amount]);

  // 輪詢 state
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
  const [localSec, setLocalSec] = useState<number>(0);
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
    if (data.phase !== "BETTING") {
      setErr("目前非下注時間");
      return;
    }
    if (!isAmountValid) {
      setErr("請輸入正確的下注金額");
      return;
    }
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
    } catch (e: any) {
      setErr(e?.message || "下注失敗");
    } finally {
      setPlacing(null);
    }
  }

  const outcomeMark = data?.result?.outcome ?? null;

  // 從 API 兩種欄位取牌面（兼容）
  const playerCards =
    data?.result?.playerCards ??
    data?.cards?.player ??
    [];
  const bankerCards =
    data?.result?.bankerCards ??
    data?.cards?.banker ??
    [];

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* 頂部列 */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn glass tilt" onClick={() => router.push("/lobby")} title="回大廳">
            ← 回大廳
          </button>
          <div className="glass px-4 py-2 rounded-xl">
            <div className="text-sm opacity-80">房間</div>
            <div className="text-lg font-semibold">{data?.room.name || room}</div>
          </div>
          <div className="glass px-4 py-2 rounded-xl">
            <div className="text-sm opacity-80">局序</div>
            <div className="text-lg font-semibold">{data ? pad4(data.roundSeq) : "--"}</div>
          </div>
          <div className="glass px-4 py-2 rounded-xl">
            <div className="text-sm opacity-80">狀態</div>
            <div className="text-lg font-semibold">{data ? zhPhase[data.phase] : "載入中"}</div>
          </div>
          <div className="glass px-4 py-2 rounded-xl">
            <div className="text-sm opacity-80">倒數</div>
            <div className="text-lg font-semibold">
              {typeof localSec === "number" ? `${localSec}s` : "--"}
            </div>
          </div>
        </div>

        <div className="text-right">
          {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
          <div className="opacity-70 text-xs">（時間以伺服器為準）</div>
        </div>
      </div>

      {/* 內容區 */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6 pb-16">
        {/* 左：下注區 */}
        <div className="md:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen">
            <div className="flex items-center justify-between mb-4">
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

            {/* 籌碼列 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {chipOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setAmount(c)}
                  disabled={data?.phase !== "BETTING"}
                  className={`px-3 py-1 rounded-full border transition
                    ${amount === c ? "border-white/70 bg-white/10" : "border-white/20 hover:border-white/40"}`}
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

            {/* 壓：閒／和／莊 */}
            <div className="grid grid-cols-3 gap-4">
              <button
                disabled={placing === "PLAYER" || data?.phase !== "BETTING" || !isAmountValid}
                onClick={() => place("PLAYER")}
                className="relative overflow-hidden rounded-2xl p-5 transition active:scale-95 border hover:border-cyan-300/50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(103,232,249,.18), rgba(255,255,255,.06))",
                  borderColor: "rgba(103,232,249,.4)",
                }}
              >
                <div className="text-2xl font-extrabold">壓「閒」</div>
                <div className="opacity-80 text-sm mt-1">1 : 1</div>
                {!!data?.myBets?.PLAYER && (
                  <div className="text-xs opacity-80 mt-2">我本局：{data.myBets.PLAYER}</div>
                )}
                <div className="sheen absolute inset-0 pointer-events-none" />
              </button>

              <button
                disabled={placing === "TIE" || data?.phase !== "BETTING" || !isAmountValid}
                onClick={() => place("TIE")}
                className="relative overflow-hidden rounded-2xl p-5 transition active:scale-95 border hover:border-yellow-200/50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(253,230,138,.18), rgba(255,255,255,.06))",
                  borderColor: "rgba(253,230,138,.4)",
                }}
              >
                <div className="text-2xl font-extrabold">壓「和」</div>
                <div className="opacity-80 text-sm mt-1">1 : 8</div>
                {!!data?.myBets?.TIE && (
                  <div className="text-xs opacity-80 mt-2">我本局：{data.myBets.TIE}</div>
                )}
                <div className="sheen absolute inset-0 pointer-events-none" />
              </button>

              <button
                disabled={placing === "BANKER" || data?.phase !== "BETTING" || !isAmountValid}
                onClick={() => place("BANKER")}
                className="relative overflow-hidden rounded-2xl p-5 transition active:scale-95 border hover:border-rose-300/50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(253,164,175,.18), rgba(255,255,255,.06))",
                  borderColor: "rgba(253,164,175,.4)",
                }}
              >
                <div className="text-2xl font-extrabold">壓「莊」</div>
                <div className="opacity-80 text-sm mt-1">1 : 0.95</div>
                {!!data?.myBets?.BANKER && (
                  <div className="text-xs opacity-80 mt-2">我本局：{data.myBets.BANKER}</div>
                )}
                <div className="sheen absolute inset-0 pointer-events-none" />
              </button>
            </div>

            {/* 翻牌/結果 */}
            {data?.phase !== "BETTING" && (
              <div className="mt-8">
                <div className="text-sm opacity-80 mb-2">本局結果</div>

                {/* 真牌面 + 金光 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <CardFlip
                    title="閒"
                    cards={playerCards as any}
                    reveal={true}
                    win={outcomeMark === "PLAYER"}
                  />
                  <CardFlip
                    title="莊"
                    cards={bankerCards as any}
                    reveal={true}
                    win={outcomeMark === "BANKER"}
                  />
                </div>

                {/* 合計與贏方中文 */}
                {data?.result && (
                  <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                    <FlipTile label="閒" value={data.result.p ?? 0} outcome={data.result.outcome} />
                    <FlipTile label="莊" value={data.result.b ?? 0} outcome={data.result.outcome} />
                  </div>
                )}
                <div className="mt-3 text-lg">
                  結果：<span className="font-bold">{fmtOutcome(outcomeMark)}</span>
                </div>
              </div>
            )}

            {data?.phase === "BETTING" && (
              <div className="mt-8 opacity-80">等待下注結束後將自動開牌…</div>
            )}
          </div>
        </div>

        {/* 右：路子 / 歷史 */}
        <div>
          <div className="glass glow-ring p-6 rounded-2xl mb-6">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            {/* 原色塊大路 */}
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
                  {r.outcome ? zhOutcome[r.outcome] : "—"}
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
                </tbody>
              </table>
            </div>
          </div>

          {/* 新增：表情路子（🟦/🟥/🟨） */}
          <div className="glass glow-ring p-6 rounded-2xl">
            <div className="text-xl font-bold mb-3">表情路子</div>
            <div className="flex flex-wrap gap-2 text-lg">
              {(data?.recent || []).slice(0, 20).map((r) => {
                const icon =
                  r.outcome === "PLAYER" ? "🟦" : r.outcome === "BANKER" ? "🟥" : "🟨";
                return (
                  <span
                    key={`emo-${r.roundSeq}`}
                    className="px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                    title={`#${pad4(r.roundSeq)}：${fmtOutcome(r.outcome)}  閒${r.p} / 莊${r.b}`}
                  >
                    {icon}
                  </span>
                );
              })}
              {(!data || (data && data.recent.length === 0)) && (
                <span className="opacity-60 text-sm">暫無資料</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 翻牌卡片（舊的總點/金光，保留） */
function FlipTile({
  label,
  value,
  outcome,
}: {
  label: "閒" | "莊";
  value: number;
  outcome: Outcome;
}) {
  const isWin =
    (label === "閒" && outcome === "PLAYER") ||
    (label === "莊" && outcome === "BANKER");
  return (
    <div className="flip-3d h-28">
      <div
        className={`flip-inner ${outcome ? "animate-[flipIn_.8s_ease_forwards]" : ""}`}
        style={{ transform: outcome ? "rotateY(180deg)" : "none" }}
      >
        <div className="flip-front glass flex items-center justify-center text-xl font-bold">
          {label}
        </div>
        <div
          className={`flip-back relative flex items-center justify-center text-3xl font-extrabold rounded-2xl ${
            isWin ? "shadow-[0_0_32px_rgba(255,215,0,.35)]" : ""
          }`}
          style={{
            background:
              label === "閒"
                ? "linear-gradient(135deg, rgba(103,232,249,.15), rgba(255,255,255,.06))"
                : "linear-gradient(135deg, rgba(253,164,175,.15), rgba(255,255,255,.06))",
            border:
              label === "閒"
                ? "1px solid rgba(103,232,249,.5)"
                : "1px solid rgba(253,164,175,.5)",
          }}
        >
          {value ?? 0} 點
        </div>
      </div>
    </div>
  );
}
