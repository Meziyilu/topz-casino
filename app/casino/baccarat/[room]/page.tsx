// app/casino/baccarat/[room]/page.tsx
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
const fmtOutcome = (o: Outcome) => (o ? zhOutcome[o] : "—");
const pad4 = (n: number) => n.toString().padStart(4, "0");

export default function RoomPage() {
  const { room } = useParams<{ room: string }>();
  const router = useRouter();
  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<null | string>(null);
  const [err, setErr] = useState<string>("");
  const [muted, setMuted] = useState(false);

  // 音效
  const tickSnd = useRef<HTMLAudioElement | null>(null);
  const flipSnd = useRef<HTMLAudioElement | null>(null);
  const winSnd  = useRef<HTMLAudioElement | null>(null);
  const betSnd  = useRef<HTMLAudioElement | null>(null);
  const canPlayRef = useRef(false);

  // 贏分特效
  const [winBurst, setWinBurst] = useState<Outcome>(null);
  const prevPhase = useRef<Phase | null>(null);
  const prevSec = useRef<number | null>(null);

  useEffect(() => {
    // 預載音效
    tickSnd.current = new Audio("/sounds/tick.mp3");
    flipSnd.current = new Audio("/sounds/flip.mp3");
    winSnd.current  = new Audio("/sounds/win.mp3");
    betSnd.current  = new Audio("/sounds/click.mp3");
    for (const a of [tickSnd, flipSnd, winSnd, betSnd]) {
      if (a.current) {
        a.current.preload = "auto";
        a.current.volume = 0.6;
      }
    }
    // 只要使用者任意點擊，就允許播放
    const allow = () => (canPlayRef.current = true);
    window.addEventListener("pointerdown", allow, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", allow, { capture: true } as any);
  }, []);

  function play(a?: HTMLAudioElement | null) {
    if (muted || !canPlayRef.current || !a) return;
    if (!a.src) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }

  // 拉狀態（每秒）
  useEffect(() => {
    let mounted = true;
    let timer: any;

    async function load() {
      try {
        const res = await fetch(
          `/api/casino/baccarat/state?room=${encodeURIComponent(String(room))}`,
          { cache: "no-store", credentials: "include" }
        );
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

  // 本地倒數
  const [localSec, setLocalSec] = useState<number>(0);
  useEffect(() => {
    if (data) setLocalSec(data.secLeft);
  }, [data?.secLeft]);

  useEffect(() => {
    if (localSec <= 0) return;
    const t = setInterval(() => setLocalSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [localSec]);

  // 音效觸發：倒數 3 秒內滴答、進入開牌時翻牌、結算時贏分
  useEffect(() => {
    if (!data) return;

    // 倒數滴答
    if (data.phase === "BETTING") {
      if (prevSec.current !== null && data.secLeft < prevSec.current && data.secLeft <= 3 && data.secLeft > 0) {
        play(tickSnd.current);
      }
      prevSec.current = data.secLeft;
    } else {
      prevSec.current = null;
    }

    // 進入開牌
    if (prevPhase.current === "BETTING" && data.phase === "REVEALING") {
      play(flipSnd.current);
    }

    // 進入結算
    if (data.phase === "SETTLED" && data.result?.outcome) {
      play(winSnd.current);
      // 顯示 1 秒贏分特效
      setWinBurst(data.result.outcome);
      const to = setTimeout(() => setWinBurst(null), 1200);
      return () => clearTimeout(to);
    }

    prevPhase.current = data.phase;
  }, [data?.phase, data?.secLeft, data?.result?.outcome]);

  async function place(side: "PLAYER" | "BANKER" | "TIE", amount = 100) {
    if (!data) return;
    if (data.phase !== "BETTING") {
      setErr("目前非下注時間");
      return;
    }
    setPlacing(side);
    try {
      play(betSnd.current);
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
    <div className="min-h-screen bg-casino-bg text-white relative overflow-hidden">
      {/* 贏分特效（簡易光束 / 霓虹） */}
      {winBurst && (
        <div
          className="pointer-events-none absolute inset-0 animate-[pulse-border_1.2s_ease-out_1]"
          style={{
            boxShadow:
              winBurst === "PLAYER"
                ? "inset 0 0 160px rgba(103,232,249,.25)"
                : winBurst === "BANKER"
                ? "inset 0 0 160px rgba(253,164,175,.25)"
                : "inset 0 0 160px rgba(253,230,138,.25)",
          }}
        />
      )}

      {/* 上方資訊列 */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn glass tilt" onClick={() => router.push("/lobby")}>
            ← 回大廳
          </button>

          <InfoPill title="房間" value={data?.room.name || String(room)} />
          <InfoPill title="局序" value={data ? pad4(data.roundSeq) : "--"} />
          <InfoPill title="狀態" value={data ? zhPhase[data.phase] : "載入中"} />
          <InfoPill title="倒數" value={typeof localSec === "number" ? `${localSec}s` : "--"} />
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`btn glass tilt ${muted ? "opacity-70" : ""}`}
            onClick={() => setMuted((m) => !m)}
            title={muted ? "已靜音" : "點擊靜音 / 取消靜音"}
          >
            {muted ? "🔇 靜音" : "🔊 聲音"}
          </button>
          <div className="text-right">
            {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
            <div className="opacity-70 text-xs">（時間以伺服器為準）</div>
          </div>
        </div>
      </div>

      {/* 內容 */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6 pb-16">
        {/* 左：下注＋翻牌 */}
        <div className="md:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen">
            <div className="text-xl font-bold mb-4">下注面板</div>

            <div className="grid grid-cols-3 gap-4">
              <button
                disabled={placing === "PLAYER" || data?.phase !== "BETTING"}
                onClick={() => place("PLAYER")}
                className="btn shimmer"
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
              >
                壓「莊」
                {!!data?.myBets?.BANKER && (
                  <span className="ml-2 text-xs opacity-80">（我: {data.myBets.BANKER}）</span>
                )}
              </button>
            </div>

            {/* 翻牌結果 */}
            {data?.phase !== "BETTING" && data?.result && (
              <div className="mt-8">
                <div className="text-sm opacity-80 mb-2">本局結果</div>
                <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                  <FlipTile label="閒" value={data.result.p ?? 0} outcome={data.result.outcome} />
                  <FlipTile label="莊" value={data.result.b ?? 0} outcome={data.result.outcome} />
                </div>
                <div className="mt-3 text-lg">
                  結果：<span className="font-bold">{fmtOutcome(data.result.outcome)}</span>
                </div>
              </div>
            )}

            {data?.phase === "BETTING" && (
              <div className="mt-8 opacity-80">等待下注結束後將自動開牌…</div>
            )}
          </div>
        </div>

        {/* 右：路子（近 20 局） */}
        <div className="">
          <div className="glass glow-ring p-6 rounded-2xl">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>

            {/* 色塊簡版大路 */}
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

function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass px-4 py-2 rounded-xl">
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/** 翻牌卡片（強化翻牌動畫 + 光澤 + 勝方微光） */
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
    <div className="flip-3d h-32">
      <div
        className={`flip-inner ${outcome ? "animate-[flipIn_.7s_cubic-bezier(.2,.7,.2,1)_forwards]" : ""}`}
        style={{ transform: outcome ? "rotateY(180deg)" : "none" }}
      >
        {/* 正面：未翻開（霧面 + 高光掃過） */}
        <div className="flip-front glass flex items-center justify-center text-xl font-bold relative sheen">
          {label}
        </div>

        {/* 背面：已翻開（總點數） */}
        <div
          className={`flip-back flex items-center justify-center text-3xl font-extrabold rounded-2xl ${
            isWin ? "shadow-[0_0_32px_rgba(255,255,255,.35)]" : ""
          }`}
          style={{
            background:
              label === "閒"
                ? "linear-gradient(135deg, rgba(103,232,249,.18), rgba(255,255,255,.06))"
                : "linear-gradient(135deg, rgba(253,164,175,.18), rgba(255,255,255,.06))",
            border:
              label === "閒"
                ? "1px solid rgba(103,232,249,.55)"
                : "1px solid rgba(253,164,175,.55)",
          }}
        >
          {value ?? 0} 點
        </div>
      </div>
    </div>
  );
}
