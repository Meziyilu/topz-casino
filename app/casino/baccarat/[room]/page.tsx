// app/casino/baccarat/[room]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";
type RoomCode = "R30" | "R60" | "R90";
type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

type StateResp = {
  room: { code: RoomCode; name: string; durationSeconds: number };
  day: string;
  roundId: string;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: | null | {
    outcome: "PLAYER" | "BANKER" | "TIE" | null;
    p: number | null;
    b: number | null;
  };
  myBets: Partial<Record<BetSide, number>>;
  recent: Array<{ roundSeq: number; outcome: "PLAYER" | "BANKER" | "TIE" | null; p: number; b: number }>;
};

const SIDE_LABEL: Record<BetSide, string> = {
  PLAYER: "閒",
  BANKER: "莊",
  TIE: "和",
  PLAYER_PAIR: "閒對",
  BANKER_PAIR: "莊對",
};

export default function BaccaratRoomPage() {
  const router = useRouter();
  const params = useParams<{ room: string }>();
  const roomCode = String(params.room || "R60").toUpperCase() as RoomCode;

  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [err, setErr] = useState<string>("");

  // 用於控制翻牌動畫：當 phase → REVEALING → SETTLED 時，依序翻四張
  const [revealStep, setRevealStep] = useState<number>(0); // 0 ~ 4
  const lastPhaseRef = useRef<Phase | null>(null);

  // 輪詢房間狀態
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/casino/baccarat/state?room=${roomCode}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as StateResp;
          if (!stop) setState(data);
        } else if (res.status === 401) {
          router.replace("/login");
          return;
        }
      } catch {}
      if (!stop) setTimeout(poll, 1000);
    }
    poll();
    return () => {
      stop = true;
    };
  }, [roomCode, router]);

  // 控制翻牌動畫：進入 REVEALING 時，依序增加 step，SETTLED 時補滿
  useEffect(() => {
    const phase = state?.phase || null;
    if (!phase) return;

    // phase 切換時重置
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase;
      if (phase === "BETTING") {
        setRevealStep(0);
      } else if (phase === "REVEALING") {
        setRevealStep(0);
        // 依序翻：一秒一張（P1 -> B1 -> P2 -> B2）
        let i = 0;
        const timer = setInterval(() => {
          i += 1;
          setRevealStep((prev) => Math.min(4, prev + 1));
          if (i >= 4) clearInterval(timer);
        }, 900);
        return () => clearInterval(timer);
      } else if (phase === "SETTLED") {
        setRevealStep(4);
      }
    }
  }, [state?.phase]);

  // 進度條（下注階段）
  const progressPct = useMemo(() => {
    if (!state) return 0;
    if (state.phase !== "BETTING") return 100;
    const total = state.room.durationSeconds;
    const left = state.secLeft;
    const passed = Math.max(0, total - left);
    return Math.min(100, Math.floor((passed / total) * 100));
  }, [state]);

  // 下注
  async function place(side: BetSide) {
    if (!state || state.phase !== "BETTING") {
      setErr("目前非下注時間");
      return;
    }
    if (!amount || amount <= 0) {
      setErr("請輸入有效金額");
      return;
    }
    setPlacing(true);
    setErr("");
    try {
      const res = await fetch(`/api/casino/baccarat/bet?room=${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "下注失敗");
      }
    } catch (e: any) {
      setErr(e?.message || "下注失敗");
    } finally {
      setPlacing(false);
      // 立即刷新一次狀態
      try {
        const r = await fetch(`/api/casino/baccarat/state?room=${roomCode}`, { cache: "no-store" });
        if (r.ok) setState(await r.json());
      } catch {}
    }
  }

  // 小籌碼快捷
  function addChip(v: number) {
    setAmount((x) => Math.max(0, (x || 0) + v));
  }

  if (loading && !state) {
    // 第一輪尚未拿到任何資料才顯示 Loading
    return (
      <div className="min-h-dvh grid place-items-center bg-gradient-to-br from-slate-950 via-zinc-900 to-black text-zinc-300">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-black">
      {/* 背景光暈 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl animate-pulse"></div>
      </div>

      {/* 頂部條 */}
      <header className="sticky top-0 z-10">
        <div className="backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/lobby" className="text-zinc-300 hover:text-white transition">
                ← 返回大廳
              </Link>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-300 to-yellow-400 shadow"></div>
              <div className="text-lg font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400">
                TOPZCASINO
              </div>
            </div>
            <div className="text-xs md:text-sm text-zinc-300">
              {state?.room?.name}・房間 {state?.room?.code}・局序 {state?.roundSeq ?? "—"}
            </div>
          </div>
        </div>
      </header>

      {/* 內容 */}
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* 倒數＋進度 */}
        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-white text-lg font-semibold">
              {state?.phase === "BETTING" ? "下注中" : state?.phase === "REVEALING" ? "開牌中" : "已結算"}
            </div>
            <div className="text-zinc-300 text-sm">
              倒數：<span className="text-white font-bold">{state?.secLeft ?? "—"}</span>s
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        {/* 牌面＋翻牌動畫（簡化為 P1,B1,P2,B2 四張） */}
        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Player 牌區 */}
            <div>
              <div className="text-zinc-300 text-sm mb-2">PLAYER</div>
              <div className="flex gap-3">
                {[0, 2].map((idx) => (
                  <FlipCard key={idx} flipped={revealStep > idx} label={state?.result?.p ?? 0} side="P" />
                ))}
              </div>
              <div className="mt-2 text-zinc-400 text-sm">
                點數：<span className="text-white font-semibold">{state?.result?.p ?? (revealStep > 0 ? "…" : "—")}</span>
              </div>
            </div>
            {/* Banker 牌區 */}
            <div>
              <div className="text-zinc-300 text-sm mb-2 text-right">BANKER</div>
              <div className="flex gap-3 justify-end">
                {[1, 3].map((idx) => (
                  <FlipCard key={idx} flipped={revealStep > idx} label={state?.result?.b ?? 0} side="B" />
                ))}
              </div>
              <div className="mt-2 text-zinc-400 text-sm text-right">
                點數：<span className="text-white font-semibold">{state?.result?.b ?? (revealStep > 1 ? "…" : "—")}</span>
              </div>
            </div>
          </div>

          {state?.phase === "SETTLED" && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-white">
                結果：{state.result?.outcome === "PLAYER" ? "閒" : state.result?.outcome === "BANKER" ? "莊" : "和"}
              </span>
            </div>
          )}
        </section>

        {/* 下注區 */}
        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                className="w-32 rounded-lg border border-white/10 bg-black/30 text-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                placeholder="金額"
              />
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 5000].map((c) => (
                  <button
                    key={c}
                    onClick={() => addChip(c)}
                    className="rounded-md bg-emerald-400/90 text-black text-sm font-semibold px-3 py-1.5 hover:bg-emerald-300 transition"
                  >
                    +{c.toLocaleString()}
                  </button>
                ))}
                <button
                  onClick={() => setAmount(0)}
                  className="rounded-md bg-white/10 text-zinc-300 text-sm font-semibold px-3 py-1.5 hover:bg-white/20 transition border border-white/10"
                >
                  清空
                </button>
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            {(["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"] as BetSide[]).map((side) => {
              const mine = state?.myBets?.[side] ?? 0;
              return (
                <button
                  key={side}
                  disabled={placing || state?.phase !== "BETTING"}
                  onClick={() => place(side)}
                  className="group rounded-xl border border-white/10 bg-black/30 hover:border-emerald-300/50 hover:bg-white/10 text-white px-4 py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="text-lg font-semibold">{SIDE_LABEL[side]}</div>
                  <div className="mt-1 text-xs text-zinc-400 group-hover:text-zinc-200 transition">
                    我已下：{Number(mine).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 路子（近 20 局） */}
        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">近 20 局</h3>
            <div className="text-xs text-zinc-400">每日 00:00（台北）重置局序</div>
          </div>
          <div className="grid grid-cols-10 gap-2">
            {(state?.recent || []).map((r) => (
              <div
                key={r.roundSeq}
                className="rounded-lg border border-white/10 bg-black/30 p-2 text-center text-xs text-zinc-300"
                title={`#${r.roundSeq}：${r.outcome ?? "—"}（P:${r.p} / B:${r.b}）`}
              >
                <div className="text-[10px] text-zinc-400">#{String(r.roundSeq).padStart(4, "0")}</div>
                <div className="mt-1 text-base font-bold">
                  {r.outcome === "PLAYER" ? "閒" : r.outcome === "BANKER" ? "莊" : "和"}
                </div>
              </div>
            ))}
            {(!state?.recent || state.recent.length === 0) && (
              <div className="col-span-10 text-center text-zinc-400 text-sm">暫無資料</div>
            )}
          </div>
        </section>
      </main>

      {/* 牌翻轉動畫 style（只在此頁作用） */}
      <style jsx global>{`
        .flip-wrap {
          perspective: 1000px;
        }
        .flip-card {
          width: 90px;
          height: 130px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
          border-radius: 12px;
        }
        .flip-card.flipped {
          transform: rotateY(180deg);
        }
        .flip-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 8px 30px rgba(0,0,0,.35);
        }
        .flip-front {
          background: linear-gradient(135deg, rgba(0,0,0,.55), rgba(20,20,20,.65));
        }
        .flip-back {
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.15), rgba(255,255,255,.05));
          transform: rotateY(180deg);
        }
        .flip-mark {
          font-weight: 800;
          letter-spacing: .08em;
          font-size: 28px;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,.45);
        }
      `}</style>
    </div>
  );
}

/** 單張翻牌卡片（簡化版：未提供花色；以 P/B 與點數或花紋表達） */
function FlipCard({ flipped, label, side }: { flipped: boolean; label: number | null | undefined; side: "P" | "B" }) {
  return (
    <div className="flip-wrap">
      <div className={`flip-card ${flipped ? "flipped" : ""}`}>
        <div className="flip-face flip-front">
          <div className="flip-mark">{side}</div>
        </div>
        <div className="flip-face flip-back">
          <div className="flip-mark">{typeof label === "number" ? label : "?"}</div>
        </div>
      </div>
    </div>
  );
}
