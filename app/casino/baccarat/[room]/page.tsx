"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const AMOUNTS = [50, 100, 500, 1000];

export default function RoomPage() {
  const { room } = useParams<{ room: string }>();
  const router = useRouter();

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<null | string>(null);
  const [err, setErr] = useState<string>("");

  // 下注額度（籌碼）
  const [stake, setStake] = useState<number>(100);

  // ---- 取得狀態（每秒輪詢）----
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

  // ---- 前端倒數（畫面更順）----
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

  // ---- 翻牌時序控制（REVEALING 才觸發）----
  const prevPhase = useRef<Phase | null>(null);
  const [flipP, setFlipP] = useState(false);
  const [flipB, setFlipB] = useState(false);

  // 每次 phase 改變時調整翻牌
  useEffect(() => {
    if (!data) return;
    const phase = data.phase;

    // 當進入 REVEALING，按節奏翻牌
    if (phase === "REVEALING" && prevPhase.current !== "REVEALING") {
      setFlipP(false);
      setFlipB(false);

      // 先翻閒，再翻莊（你可以調整時間）
      const t1 = setTimeout(() => setFlipP(true), 300);   // 0.3s 翻閒
      const t2 = setTimeout(() => setFlipB(true), 1400);  // 1.4s 翻莊

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // 回到 BETTING 或已結算，將翻牌重置
    if (phase === "BETTING") {
      setFlipP(false);
      setFlipB(false);
    }
    if (phase === "SETTLED" && prevPhase.current !== "SETTLED") {
      // 保持已翻開（讓結果保留一段時間，API 也有給 secLeft）
      setFlipP(true);
      setFlipB(true);
    }

    prevPhase.current = phase;
  }, [data?.phase]);

  // ---- 下注 ----
  async function place(side: "PLAYER" | "BANKER" | "TIE") {
    if (!data) return;
    if (data.phase !== "BETTING") {
      setErr("目前非下注時間");
      return;
    }
    setPlacing(side);
    try {
      const res = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: data.room.code, side, amount: stake }),
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

  const outcomeMark = useMemo(() => data?.result?.outcome ?? null, [data?.result]);

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
            <div className="text-lg font-semibold">{data?.room?.name || room}</div>
          </div>
          <div className="glass px-4 py-2 rounded-xl">
            <div className="text-sm opacity-80">局序</div>
            <div className="text-lg font-semibold">{data ? pad4(data.roundSeq) : "--"}</div>
          </div>
          <div className="glass px-4 py-2 rounded-xl">
            <div className="text-sm opacity-80">狀態</div>
            <div className="text-lg font-semibold">
              {data ? zhPhase[data.phase] : "載入中"}
            </div>
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
            <div className="text-xl font-bold mb-4">下注面板</div>

            {/* 籌碼選擇 */}
            <div className="flex gap-3 mb-4">
              {AMOUNTS.map((v) => (
                <button
                  key={v}
                  onClick={() => setStake(v)}
                  className={`px-3 py-1 rounded-full border ${
                    stake === v ? "bg-white/20 border-white" : "bg-white/10 border-white/30"
                  }`}
                >
                  ${v}
                </button>
              ))}
              <div className="ml-2 opacity-80 text-sm self-center">當前下注額：${stake}</div>
            </div>

            {/* 三邊下注 */}
            <div className="grid grid-cols-3 gap-4">
              <button
                disabled={placing === "PLAYER" || data?.phase !== "BETTING"}
                onClick={() => place("PLAYER")}
                className="btn shimmer"
                title="賠率 1:1（抽水 5% 可在後端調整）"
              >
                壓「閒」
                {!!data?.myBets?.PLAYER && (
                  <span className="ml-2 text-xs opacity-80">（我: {data.myBets.PLAYER}）</span>
                )}
              </button>
              <button
                disabled={placing === "TIE" || data?.phase !== "BETTING"}
                onClick={() => place("TIE")}
                className="btn shimmer"
                title="賠率 1:8"
              >
                壓「和」
                {!!data?.myBets?.TIE && (
                  <span className="ml-2 text-xs opacity-80">（我: {data.myBets.TIE}）</span>
                )}
              </button>
              <button
                disabled={placing === "BANKER" || data?.phase !== "BETTING"}
                onClick={() => place("BANKER")}
                className="btn shimmer"
                title="賠率 1:0.95（抽水 5%）"
              >
                壓「莊」
                {!!data?.myBets?.BANKER && (
                  <span className="ml-2 text-xs opacity-80">（我: {data.myBets.BANKER}）</span>
                )}
              </button>
            </div>

            {/* 翻牌/結果 */}
            {data?.result && (
              <div className="mt-8">
                <div className="text-sm opacity-80 mb-2">本局結果</div>
                <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                  <FlipTile
                    label="閒"
                    value={data.result.p ?? 0}
                    flipped={flipP}
                    isWin={data.result.outcome === "PLAYER"}
                  />
                  <FlipTile
                    label="莊"
                    value={data.result.b ?? 0}
                    flipped={flipB}
                    isWin={data.result.outcome === "BANKER"}
                  />
                </div>
                <div className="mt-3 text-lg">
                  結果：<span className="font-bold">{fmtOutcome(outcomeMark)}</span>
                </div>
              </div>
            )}

            {!data?.result && data?.phase === "BETTING" && (
              <div className="mt-8 opacity-80">等待下注結束後將自動開牌…</div>
            )}
          </div>
        </div>

        {/* 右：路子 / 歷史 */}
        <div className="">
          <div className="glass glow-ring p-6 rounded-2xl">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            {/* 大路色塊（簡化版） */}
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
              {data && data.recent.length === 0 && (
                <div className="opacity-60 text-sm">暫無資料</div>
              )}
            </div>

            {/* 表格（可選） */}
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
                  {data && data.recent.length === 0 && (
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
        </div>
      </div>
    </div>
  );
}

/** 翻牌卡片：front/back，透過 .flipped 切換 3D 旋轉 */
function FlipTile({
  label,
  value,
  flipped,
  isWin,
}: {
  label: "閒" | "莊";
  value: number;
  flipped: boolean;
  isWin: boolean;
}) {
  return (
    <div className="flip-3d h-28">
      <div className={`flip-inner ${flipped ? "flipped" : ""}`}>
        {/* 正面 */}
        <div className="flip-front glass flex items-center justify-center text-xl font-bold">
          {label}
        </div>
        {/* 背面 */}
        <div
          className={`flip-back flex items-center justify-center text-3xl font-extrabold rounded-2xl ${
            isWin ? "shadow-[0_0_24px_rgba(255,255,255,.3)]" : ""
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
