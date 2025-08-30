// app/casino/baccarat/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  cards?: { player: string[]; banker: string[] }; // 新增：牌面（REVEALING/SETTLED 才會有）
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

  // ✅ 籌碼與自訂金額（保留原本下注流程，只是視覺增強）
  const chipOptions = [50, 100, 500, 1000];
  const [amount, setAmount] = useState<number>(100);
  const isAmountValid = useMemo(() => Number.isFinite(amount) && amount > 0, [amount]);

  // 輪詢 state（保留）
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

  // 倒數本地同步（保留）
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

  const outcomeMark = useMemo(() => (data?.result ? data.result.outcome : null), [data?.result]);

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* 頂部列（保留） */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn glass tilt" onClick={() => router.push("/lobby")} title="回大廳">
            ← 回大廳
          </button>
          <InfoPill title="房間" value={data?.room.name || String(room)} />
          <InfoPill title="局序" value={data ? pad4(data.roundSeq) : "--"} />
          <InfoPill title="狀態" value={data ? zhPhase[data.phase] : "載入中"} />
          <InfoPill title="倒數" value={typeof localSec === "number" ? `${localSec}s` : "--"} />
        </div>
        <div className="text-right">
          {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
          <div className="opacity-70 text-xs">（時間以伺服器為準）</div>
        </div>
      </div>

      {/* 內容區（左下注 / 右路子） */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6 pb-16">
        {/* 左：下注區（保留＋加強） */}
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

            {/* 籌碼列（新增） */}
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
                title="快速 +50"
              >
                +50
              </button>
              <button
                onClick={() => setAmount((a) => a + 100)}
                disabled={data?.phase !== "BETTING"}
                className="px-3 py-1 rounded-full border border-white/20 hover:border-white/40 transition"
                title="快速 +100"
              >
                +100
              </button>
              <button
                onClick={() => setAmount(0)}
                disabled={data?.phase !== "BETTING"}
                className="px-3 py-1 rounded-full border border-white/20 hover:border-white/40 transition"
                title="清除"
              >
                清除
              </button>
            </div>

            {/* 壓 閒／和／莊（保留樣式、文案） */}
            <div className="grid grid-cols-3 gap-4">
              <BetButton
                title='壓「閒」'
                ratio="1 : 1"
                disabled={placing === "PLAYER" || data?.phase !== "BETTING" || !isAmountValid}
                accent="cyan"
                my={data?.myBets?.PLAYER}
                onClick={() => place("PLAYER")}
              />
              <BetButton
                title='壓「和」'
                ratio="1 : 8"
                disabled={placing === "TIE" || data?.phase !== "BETTING" || !isAmountValid}
                accent="yellow"
                my={data?.myBets?.TIE}
                onClick={() => place("TIE")}
              />
              <BetButton
                title='壓「莊」'
                ratio="1 : 0.95"
                disabled={placing === "BANKER" || data?.phase !== "BETTING" || !isAmountValid}
                accent="rose"
                my={data?.myBets?.BANKER}
                onClick={() => place("BANKER")}
              />
            </div>

            {/* 翻牌/結果（新增 CardList；保留原介紹） */}
            {data?.phase !== "BETTING" && data?.result && (
              <div className="mt-8">
                <div className="text-sm opacity-80 mb-3">本局結果</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <CardList
                    label="閒方"
                    cards={data.cards?.player || []}
                    total={data.result.p ?? 0}
                    outcome={data.result.outcome}
                    isWinner={data.result.outcome === "PLAYER"}
                    side="PLAYER"
                  />
                  <CardList
                    label="莊方"
                    cards={data.cards?.banker || []}
                    total={data.result.b ?? 0}
                    outcome={data.result.outcome}
                    isWinner={data.result.outcome === "BANKER"}
                    side="BANKER"
                  />
                </div>

                <div className="mt-4 text-lg">
                  結果：<span className="font-bold">{fmtOutcome(outcomeMark)}</span>
                </div>
              </div>
            )}

            {data?.phase === "BETTING" && (
              <div className="mt-8 opacity-80">等待下注結束後將自動開牌…</div>
            )}
          </div>
        </div>

        {/* 右：路子 / 歷史（原樣保留） */}
        <div className="">
          <div className="glass glow-ring p-6 rounded-2xl">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            {/* 大路色塊 */}
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

            {/* 表情路子（新增、不影響原有） */}
            <div className="mt-6">
              <div className="mb-2 opacity-80">表情路子</div>
              <div className="grid grid-cols-8 gap-2">
                {(data?.recent || []).slice(0, 24).map((r) => (
                  <div
                    key={`e-${r.roundSeq}`}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px]"
                    style={{
                      background:
                        r.outcome === "PLAYER"
                          ? "rgba(103,232,249,.15)"
                          : r.outcome === "BANKER"
                          ? "rgba(253,164,175,.15)"
                          : "rgba(253,230,138,.15)",
                      border:
                        r.outcome === "PLAYER"
                          ? "1px solid rgba(103,232,249,.5)"
                          : r.outcome === "BANKER"
                          ? "1px solid rgba(253,164,175,.5)"
                          : "1px solid rgba(253,230,138,.5)",
                    }}
                    title={`#${pad4(r.roundSeq)}：${fmtOutcome(r.outcome)}`}
                  >
                    {r.outcome ? (r.outcome === "TIE" ? "和" : r.outcome === "PLAYER" ? "閒" : "莊") : "—"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 頂部資訊小膠囊 */
function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass px-4 py-2 rounded-xl">
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/** 下注按鈕（維持既有三顆，只是包成元件） */
function BetButton({
  title,
  ratio,
  disabled,
  accent,
  my,
  onClick,
}: {
  title: string;
  ratio: string;
  disabled?: boolean;
  accent: "cyan" | "yellow" | "rose";
  my?: number;
  onClick: () => void;
}) {
  const bg =
    accent === "cyan"
      ? "linear-gradient(135deg, rgba(103,232,249,.18), rgba(255,255,255,.06))"
      : accent === "yellow"
      ? "linear-gradient(135deg, rgba(253,230,138,.18), rgba(255,255,255,.06))"
      : "linear-gradient(135deg, rgba(253,164,175,.18), rgba(255,255,255,.06))";
  const border =
    accent === "cyan"
      ? "rgba(103,232,249,.4)"
      : accent === "yellow"
      ? "rgba(253,230,138,.4)"
      : "rgba(253,164,175,.4)";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-5 transition active:scale-95 border"
      style={{ background: bg, borderColor: border }}
    >
      <div className="text-2xl font-extrabold">{title}</div>
      <div className="opacity-80 text-sm mt-1">{ratio}</div>
      {!!my && <div className="text-xs opacity-80 mt-2">我本局：{my}</div>}
      <div className="sheen absolute inset-0 pointer-events-none" />
    </button>
  );
}

/** 牌面清單（逐張延遲翻牌 + 贏家金光） */
function CardList({
  label,
  cards,
  total,
  outcome,
  isWinner,
  side,
}: {
  label: string;
  cards: string[];
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
        <span className="opacity-80 text-sm">合計 {total} 點</span>
      </div>

      <div className="flex gap-3 justify-center items-center min-h-[88px]">
        {cards && cards.length > 0 ? (
          cards.map((c, i) => (
            <div
              key={`${label}-${i}-${c}`}
              className="w-14 h-20 rounded-xl bg-white/10 border border-white/20 
                         flex items-center justify-center text-lg font-bold
                         animate-[flipIn_.6s_ease_forwards]"
              style={{ animationDelay: `${i * 0.28}s` }}
              title={c}
            >
              {c}
            </div>
          ))
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

function GhostCard() {
  return (
    <div className="w-14 h-20 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center opacity-70">
      ?
    </div>
  );
}
