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
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
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
  const [placing, setPlacing] = useState<null | string>(null);
  const [err, setErr] = useState<string>("");

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
    return () => { mounted = false; clearInterval(timer); };
  }, [room]);

  // 倒數（前端跟著扣）
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

  // 下注
  async function place(side: "PLAYER" | "BANKER" | "TIE", amount = 100) {
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

  // 翻牌顯示鎖存（確保動畫能看到）
  const [revealLatch, setRevealLatch] = useState(false);
  const [latchKey, setLatchKey] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    if (data.roundId !== latchKey) {
      setLatchKey(data.roundId);
      setRevealLatch(false);
    }
    if (data.phase === "REVEALING" || (data.phase === "SETTLED" && data.result)) {
      setRevealLatch(true);
      const t = setTimeout(() => setRevealLatch(false), 2200);
      return () => clearTimeout(t);
    }
  }, [data?.phase, data?.result, data?.roundId]);

  const showReveal =
    (data?.phase === "REVEALING" || data?.phase === "SETTLED") &&
    (data?.result || revealLatch);

  const winner: Outcome = useMemo(() => data?.result?.outcome ?? null, [data?.result]);

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* --- 新：豪華房間面板（不影響原有功能） --- */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="room-banner glow-ring shimmer">
          <div className="rb-layer rb-grid" />
          <div className="rb-layer rb-radial" />
          <div className="rb-content">
            <div className="flex items-center gap-4">
              <button className="btn glass tilt" onClick={() => router.push("/lobby")} title="回大廳">
                ← 回大廳
              </button>
              <div className="rb-chip rb-chip-blue">房間</div>
              <div className="rb-value">{data?.room.name || String(room)}</div>
              <div className="rb-chip">局序</div>
              <div className="rb-value">{data ? pad4(data.roundSeq) : "--"}</div>
              <div className="rb-chip rb-chip-pink">狀態</div>
              <div className="rb-value">{data ? zhPhase[data.phase] : "載入中"}</div>
              <div className="rb-chip rb-chip-gold">倒數</div>
              <div className="rb-value">{typeof localSec === "number" ? `${localSec}s` : "--"}</div>
            </div>

            {/* 小籌碼飾條 */}
            <div className="rb-chips">
              <span className="chip chip-50">50</span>
              <span className="chip chip-100">100</span>
              <span className="chip chip-500">500</span>
              <span className="chip chip-1000">1000</span>
            </div>
          </div>
        </div>
      </div>

      {/* 原本上方資訊列 => 仍保留（如想更清爽可刪） */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between opacity-80">
        <div className="text-xs">（時間以伺服器為準）</div>
        {err && <div className="text-red-400 text-sm">{err}</div>}
      </div>

      {/* 內容區 */}
      <div className="max-w-6xl mx-auto px-4 grid xl:grid-cols-3 gap-6 pb-16">
        {/* 左：下注區（佔二欄） */}
        <div className="xl:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen">
            <div className="text-xl font-bold mb-4">下注面板</div>

            <div className="grid grid-cols-3 gap-4">
              <BetButton
                disabled={placing === "PLAYER" || data?.phase !== "BETTING"}
                onClick={() => place("PLAYER")}
                label="壓「閒」"
                mine={data?.myBets?.PLAYER}
              />
              <BetButton
                disabled={placing === "TIE" || data?.phase !== "BETTING"}
                onClick={() => place("TIE")}
                label="壓「和」"
                mine={data?.myBets?.TIE}
              />
              <BetButton
                disabled={placing === "BANKER" || data?.phase !== "BETTING"}
                onClick={() => place("BANKER")}
                label="壓「莊」"
                mine={data?.myBets?.BANKER}
              />
            </div>

            {/* 翻牌/結果（鎖存顯示） */}
            {showReveal && (
              <div className="mt-8">
                <div className="text-sm opacity-80 mb-3">本局結果</div>
                <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                  <FlipTile
                    label="閒"
                    value={data?.result?.p ?? 0}
                    outcome={data?.result?.outcome ?? null}
                    winner={winner === "PLAYER"}
                  />
                  <FlipTile
                    label="莊"
                    value={data?.result?.b ?? 0}
                    outcome={data?.result?.outcome ?? null}
                    winner={winner === "BANKER"}
                  />
                </div>
                <div className="mt-3 text-lg">
                  結果：<span className="font-bold">{fmtOutcome(winner)}</span>
                </div>
              </div>
            )}

            {data?.phase === "BETTING" && (
              <div className="mt-8 opacity-80">等待下注結束後將自動開牌…</div>
            )}
          </div>
        </div>

        {/* 右：路子區（原本 + 新增「圖案路子」） */}
        <div className="space-y-6">
          {/* 原本的「色塊路子 + 表格」 */}
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
                      <td colSpan={4} className="py-2 opacity-60">暫無資料</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 新增：圖案路子（Icon/Chip 風格） */}
          <IconRoadCard recent={data?.recent || []} />
        </div>
      </div>
    </div>
  );
}

/** 下注按鈕（保留你的風格、加上籌碼標示位） */
function BetButton({
  disabled,
  onClick,
  label,
  mine,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
  mine?: number;
}) {
  return (
    <button disabled={disabled} onClick={onClick} className="btn shimmer tilt relative overflow-hidden">
      {label}
      {typeof mine === "number" && mine > 0 && (
        <span className="ml-2 text-xs opacity-80">（我: {mine}）</span>
      )}
    </button>
  );
}

/** 翻牌卡片（內含：翻牌動畫 + 勝方金光） */
function FlipTile({
  label,
  value,
  outcome,
  winner,
}: {
  label: "閒" | "莊";
  value: number;
  outcome: Outcome;
  winner: boolean;
}) {
  const shouldFlip = !!outcome;

  return (
    <div className="flip-3d h-28">
      <div
        className={`flip-inner ${shouldFlip ? "animate-flip" : ""}`}
        style={{ transform: shouldFlip ? "rotateY(180deg)" : "none" }}
      >
        {/* 正面：未翻開（霧面） */}
        <div className="flip-front">{label}</div>

        {/* 背面：已翻開（點數顯示 + 勝方金光） */}
        <div
          className={`flip-back ${label === "閒" ? "back-player" : "back-banker"} ${
            winner ? "winner-glow" : ""
          }`}
        >
          <div className="text-3xl font-extrabold">{value ?? 0} 點</div>
        </div>
      </div>
    </div>
  );
}

/** 新增卡片：圖案路子（Icon/Chip 風格） */
function IconRoadCard({
  recent,
}: {
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
}) {
  const iconOf = (o: Outcome) => {
    if (o === "PLAYER") return "🅿️";
    if (o === "BANKER") return "🅱️";
    if (o === "TIE") return "⚖️";
    return "•";
  };
  return (
    <div className="glass glow-ring p-6 rounded-2xl">
      <div className="text-xl font-bold mb-4">圖案路子（近 20 局）</div>

      {/* 圓片籌碼樣式 */}
      <div className="grid grid-cols-10 gap-3">
        {recent.length > 0 ? (
          recent.slice(0, 20).map((r) => (
            <div key={`ico-${r.roundSeq}`} className="icon-chip" title={`#${pad4(r.roundSeq)}：${fmtOutcome(r.outcome)}`}>
              <div
                className={`icon-face ${
                  r.outcome === "PLAYER" ? "icon-player" :
                  r.outcome === "BANKER" ? "icon-banker" : "icon-tie"
                }`}
              >
                {iconOf(r.outcome)}
              </div>
            </div>
          ))
        ) : (
          <div className="opacity-60 text-sm">暫無資料</div>
        )}
      </div>

      {/* 迷你圖例 */}
      <div className="flex items-center gap-3 mt-4 text-xs opacity-80">
        <span className="legend-swatch lp" /> 閒
        <span className="legend-swatch lb" /> 莊
        <span className="legend-swatch lt" /> 和
      </div>
    </div>
  );
}
