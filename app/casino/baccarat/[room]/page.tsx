// app/casino/baccarat/[room]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ====== 型別 ======
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
const fmtOutcome = (o: Outcome) => (o ? zhOutcome[o] : "—");
const pad4 = (n: number) => n.toString().padStart(4, "0");

// ====== 小工具 ======
function useAudio(src: string | null, volume = 0.7) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.volume = volume;
    ref.current = a;
  }, [src, volume]);
  return {
    play: () => {
      ref.current?.currentTime && (ref.current.currentTime = 0);
      ref.current?.play().catch(() => {});
    },
  };
}

// ====== 主頁 ======
export default function RoomPage() {
  const { room } = useParams<{ room: string }>();
  const router = useRouter();

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<null | "PLAYER" | "BANKER" | "TIE">(null);
  const [err, setErr] = useState("");

  // 快速籌碼
  const AMOUNTS = [50, 100, 500, 1000];
  const [chip, setChip] = useState<number>(100);

  // 本地倒數（畫面順暢）
  const [localSec, setLocalSec] = useState<number>(0);

  // 音效（提供預設路徑；若沒有檔案也不影響）
  const sTick = useAudio("/sounds/tick.mp3", 0.55);
  const sFlip = useAudio("/sounds/flip.mp3");
  const sWin = useAudio("/sounds/win.mp3");
  const sClick = useAudio("/sounds/click.mp3");

  // 播音效：phase 變化時
  const lastPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    const p = data?.phase || null;
    if (!p) return;
    if (lastPhaseRef.current && lastPhaseRef.current !== p) {
      if (p === "REVEALING") sFlip.play();
      if (p === "SETTLED") sWin.play();
    }
    lastPhaseRef.current = p;
  }, [data?.phase]); // eslint-disable-line

  // 播音效：倒數最後 5 秒 tick
  const lastSecRef = useRef<number>(-1);
  useEffect(() => {
    if (typeof localSec !== "number") return;
    if (localSec !== lastSecRef.current) {
      // BETTING 或 REVEALING 的最後 5 秒
      if (data?.phase && (data.phase === "BETTING" || data.phase === "REVEALING")) {
        if (localSec <= 5 && localSec > 0) sTick.play();
      }
      lastSecRef.current = localSec;
    }
  }, [localSec, data?.phase]); // eslint-disable-line

  // 拉 state（每秒）
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

  // 同步本地倒數
  useEffect(() => {
    if (!data) return;
    setLocalSec(data.secLeft);
  }, [data?.secLeft]);

  useEffect(() => {
    if (localSec <= 0) return;
    const t = setInterval(() => setLocalSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [localSec]);

  async function place(side: "PLAYER" | "BANKER" | "TIE", amount: number) {
    if (!data) return;
    if (data.phase !== "BETTING") {
      setErr("目前非下注時間");
      return;
    }
    sClick.play();
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

  const outcomeMark = useMemo(() => data?.result?.outcome ?? null, [data?.result]);

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* Top bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="btn glass tilt"
            onClick={() => router.push("/lobby")}
            title="回大廳"
          >
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

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6 pb-16">
        {/* 左：下注區 */}
        <div className="md:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-bold">下注面板</div>
              {/* 快速籌碼 */}
              <div className="flex items-center gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    className={`px-3 py-1 rounded-full text-sm border transition ${
                      chip === a ? "bg-white/20 border-white/60" : "bg-white/10 border-white/20"
                    }`}
                    onClick={() => {
                      sClick.play();
                      setChip(a);
                    }}
                  >
                    ${a}
                  </button>
                ))}
              </div>
            </div>

            {/* 三邊下注 */}
            <div className="grid grid-cols-3 gap-4">
              <BetButton
                label="壓「閒」"
                disabled={placing === "PLAYER" || data?.phase !== "BETTING"}
                onClick={() => place("PLAYER", chip)}
                my={data?.myBets?.PLAYER || 0}
              />
              <BetButton
                label="壓「和」"
                disabled={placing === "TIE" || data?.phase !== "BETTING"}
                onClick={() => place("TIE", chip)}
                my={data?.myBets?.TIE || 0}
              />
              <BetButton
                label="壓「莊」"
                disabled={placing === "BANKER" || data?.phase !== "BETTING"}
                onClick={() => place("BANKER", chip)}
                my={data?.myBets?.BANKER || 0}
              />
            </div>

            {/* 翻牌 / 結果（以 roundId 為 key，確保每局重新掛載動畫） */}
            {data?.phase !== "BETTING" && (
              <div className="mt-8" key={data?.roundId || "r"}>
                <div className="text-sm opacity-80 mb-2">
                  {data?.phase === "REVEALING"
                    ? "開牌中…"
                    : data?.phase === "SETTLED" && typeof data?.secLeft === "number" && data.secLeft > 0
                    ? `本局結果將保留 ${data.secLeft}s`
                    : "本局結果"}
                </div>
                <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                  <FlipTile
                    label="閒"
                    phase={data?.phase ?? "BETTING"}
                    outcome={outcomeMark}
                    value={data?.phase === "SETTLED" ? data?.result?.p ?? 0 : null}
                  />
                  <FlipTile
                    label="莊"
                    phase={data?.phase ?? "BETTING"}
                    outcome={outcomeMark}
                    value={data?.phase === "SETTLED" ? data?.result?.b ?? 0 : null}
                  />
                </div>
                {data?.phase === "SETTLED" && data?.result && (
                  <div className="mt-3 text-lg">
                    結果：<span className="font-bold">{fmtOutcome(data.result.outcome)}</span>
                  </div>
                )}
              </div>
            )}

            {data?.phase === "BETTING" && (
              <div className="mt-8 opacity-80">等待下注結束後將自動開牌…</div>
            )}
          </div>
        </div>

        {/* 右：路子 / 歷史 */}
        <div className="">
          <div className="glass glow-ring p-6 rounded-2xl">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            {/* 大路色塊（簡化） */}
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

          </div>
        </div>
      </div>
    </div>
  );
}

// ====== 元件：下注按鈕（含我已下注金額） ======
function BetButton({
  label,
  disabled,
  onClick,
  my,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  my?: number;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`btn shimmer flex flex-col items-center justify-center py-4 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      <div className="text-base font-bold">{label}</div>
      {!!my && <div className="text-xs opacity-80 mt-1">（我：{my}）</div>}
    </button>
  );
}

// ====== 元件：翻牌卡片 ======
function FlipTile({
  label,
  value,
  outcome,
  phase,
}: {
  label: "閒" | "莊";
  value: number | null;
  outcome: Outcome;
  phase: Phase;
}) {
  const isWin =
    (label === "閒" && outcome === "PLAYER") ||
    (label === "莊" && outcome === "BANKER");

  // REVEALING 起就翻，SETTLED 顯示數字；BETTING 顯示未翻
  const shouldFlip = phase !== "BETTING";

  return (
    <div className="flip-3d h-28">
      <div
        className={`flip-inner ${shouldFlip ? "animate-[flipIn_.7s_ease_forwards]" : ""}`}
        style={{ transform: shouldFlip ? "rotateY(180deg)" : "none" }}
      >
        {/* 正面：霧面 */}
        <div className="flip-front glass flex items-center justify-center text-xl font-bold">
          {label}
        </div>

        {/* 背面：點數 */}
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
          {phase === "SETTLED" ? `${value ?? 0} 點` : "…"}
        </div>
      </div>
    </div>
  );
}
