"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Countdown from "@/components/game/lotto/Countdown";
import LottoBall from "@/components/game/lotto/LottoBall";
import LottoBetPanel, { BetItem } from "@/components/game/lotto/LottoBetPanel";
import InfoCard from "@/components/game/lotto/InfoCard";
import Toast from "@/components/game/lotto/Toast";
import Confetti from "@/components/game/lotto/Confetti";

type RoundStatus = "OPEN" | "LOCKED" | "DRAWN" | "SETTLED";
type BetStatus = "PENDING" | "WON" | "LOST" | "PAID" | "CANCELED";
type LottoAttr = "BIG" | "SMALL" | "ODD" | "EVEN";

type StateResp = {
  current: { id: string; dayISO: string; code: number; drawAt: string; status: RoundStatus; numbers: number[]; special: number | null; pool: number; jackpot: number };
  config: { drawIntervalSec: number; lockBeforeDrawSec: number; picksCount: number; pickMax: number; betTiers: number[]; bigThreshold: number };
  serverTime: string;
  locked: boolean;
};

type MyBetItem = {
  id: string; kind: string; picks: number[] | null; picksKey: string;
  ballIndex: number | null; attr: LottoAttr | null; amount: number; status: BetStatus;
  payout: number; matched: number; hitSpecial: boolean; createdAt: string;
  round: { day: string; code: number; status: RoundStatus; drawAt: string; numbers: number[]; special: number | null };
};

type HistoryItem = { day: string; code: number; drawAt: string; status: RoundStatus; numbers: number[]; special: number | null; pool: number; jackpot: number };

function clsx(...xs: (string | false | null | undefined)[]): string { return xs.filter(Boolean).join(" "); }
function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0"); const mm = String(d.getMinutes()).padStart(2, "0"); const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

export default function LottoPage() {
  const [s, setS] = useState<StateResp | null>(null);
  const [myBets, setMyBets] = useState<MyBetItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);
  const [fireConfetti, setFireConfetti] = useState<boolean>(false);
  const lastCode = useRef<number>(0);
  const lastDay = useRef<string>("");

  const audioCtx = useRef<AudioContext | null>(null);
  function ping(freq = 880, dur = 0.08): void {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioCtx.current!;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq; o.type = "triangle"; g.gain.value = 0.06;
      o.start(); setTimeout(() => { o.stop(); }, Math.floor(dur * 1000));
    } catch { /* noop */ }
  }

  const loadState = useCallback(async () => {
    const r = await fetch("/api/lotto/state", { cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as StateResp;
    setS(j);
    if (lastCode.current && (j.current.code !== lastCode.current || j.current.dayISO !== lastDay.current)) {
      setFireConfetti(true);
      ping(1175); await sleep(80); ping(988); await sleep(80); ping(1319);
      setTimeout(() => setFireConfetti(false), 1400);
      void Promise.all([loadMyBets(), loadHistory()]);
    }
    lastCode.current = j.current.code; lastDay.current = j.current.dayISO;
  }, []);

  const loadMyBets = useCallback(async () => {
    const r = await fetch("/api/lotto/my-bets?limit=50", { cache: "no-store", credentials: "include" });
    if (!r.ok) return; const j = await r.json(); setMyBets((j.items ?? []) as MyBetItem[]);
  }, []);

  const loadHistory = useCallback(async () => {
    const r = await fetch("/api/lotto/history?limit=30", { cache: "no-store" });
    if (!r.ok) return; const j = await r.json(); setHistory((j.items ?? []) as HistoryItem[]);
  }, []);

  useEffect(() => {
    void loadState(); void loadMyBets(); void loadHistory();
    const t = setInterval(() => { void loadState(); }, 1000);
    return () => clearInterval(t);
  }, [loadState, loadMyBets, loadHistory]);

  const numbers = s?.current.numbers ?? [];
  const special = s?.current.special ?? null;
  const locked = s?.locked ?? true;

  async function place(items: BetItem[], total: number): Promise<void> {
    const r = await fetch("/api/lotto/bet", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const j = await r.json();
    if (!r.ok) setToast({ type: "err", text: j?.error ?? "下注失敗" });
    else { setToast({ type: "ok", text: `下注成功，共 ${total} 元` }); ping(880); await sleep(60); ping(988); void loadMyBets(); }
  }

  const statusBadge = useMemo(() => {
    if (!s) return null;
    const c = s.current.status;
    const map: Record<string, string> = { OPEN: "bg-emerald-500/20 text-emerald-200", LOCKED: "bg-amber-500/20 text-amber-200", DRAWN: "bg-sky-500/20 text-sky-200", SETTLED: "bg-violet-500/20 text-violet-200" };
    const label: Record<string, string> = { OPEN: "開放下注", LOCKED: "封盤", DRAWN: "開獎中", SETTLED: "已結算" };
    return <span className={clsx("px-2 py-1 rounded-md text-xs", map[c])}>{label[c]}</span>;
  }, [s]);

  return (
    <main className="min-h-screen bg-[radial-gradient(100%_100%_at_50%_0%,#1f1535_0%,#0c0917_75%)] text-white">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">TopzCasino · 大樂透</h1>
            <div className="text-white/60 mt-1">時間 {formatTime(new Date())}</div>
            {s && <div className="text-xs text-white/50 mt-1">台北日：{new Date(s.current.dayISO).toLocaleDateString()}</div>}
          </div>
          <div className="text-right">
            {s && <Countdown drawAtISO={s.current.drawAt} serverTimeISO={s.serverTime} />}
            <div className="mt-2">{statusBadge}</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">第 {s?.current.code ?? "-"} 期</div>
              <div className="text-sm text-white/70">開獎時間：{s ? new Date(s.current.drawAt).toLocaleTimeString() : "-"}</div>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-3 place-items-center">
              {(numbers.length > 0 ? numbers : [0,0,0,0,0,0]).map((n, i) => (
                <LottoBall key={`${n}-${i}`} num={n || (i + 1)} reveal={numbers.length > 0} delay={i*120} bigThreshold={s?.config.bigThreshold ?? 25} />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="text-sm text-white/60">特別號</div>
              <div className={clsx("px-3 py-1.5 rounded-full border text-sm font-semibold","bg-white/10 border-white/15", special ? "animate-pop" : "opacity-60")}>
                {special ?? "待開"}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <InfoCard title="狀態" value={s?.current.status ?? "-"} />
              <InfoCard title="當期獎池" value={`${s?.current.pool ?? 0} 元`} />
              <InfoCard title="頭獎派發" value={`${s?.current.jackpot ?? 0} 元`} />
              <InfoCard title="封盤" value={s?.locked ? "是" : "否"} />
            </div>
          </div>

          {s && (
            <LottoBetPanel
              picksCount={s.config.picksCount}
              pickMax={s.config.pickMax}
              betTiers={s.config.betTiers}
              bigThreshold={s.config.bigThreshold}
              locked={s.locked || s.current.status !== "OPEN"}
              onPlace={place}
            />
          )}
        </div>

        <aside className="space-y-6">
          <div className="glass p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold">我的注單</div>
              <button className="text-xs text-white/70 hover:text-white" onClick={() => void (async () => { await Promise.all([loadMyBets(), loadState()]); })()}>
                重新整理
              </button>
            </div>
            <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {myBets.length === 0 && <div className="text-sm text-white/60">尚無資料</div>}
              {myBets.map((b) => (
                <div key={b.id} className="glass p-3">
                  <div className="text-xs text-white/60">台北日 {new Date(b.round.day).toLocaleDateString()} · 第 {b.round.code} 期 · {new Date(b.createdAt).toLocaleTimeString()}</div>
                  <div className="mt-1 flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-semibold">{b.kind}</span>
                    {b.picks && b.picks.length > 0 && <span className="text-sm">{b.picks.join("-")}</span>}
                    {b.ballIndex && b.attr && <span className="text-sm">第{b.ballIndex}顆·{b.attr}</span>}
                    <span className="px-2 py-0.5 text-xs rounded bg-white/10 border border-white/15">¥{b.amount}</span>
                    <span className={clsx("px-2 py-0.5 text-xs rounded border",
                      b.status === "PAID" ? "bg-emerald-500/15 border-emerald-500/30" :
                      b.status === "LOST" ? "bg-rose-500/15 border-rose-500/30" :
                      "bg-white/10 border-white/15"
                    )}>
                      {b.status}
                    </span>
                    {b.payout > 0 && <span className="ml-auto text-emerald-400 font-bold">+{b.payout}</span>}
                  </div>
                  {b.round.status !== "OPEN" && b.round.numbers?.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                      <span>開出：</span>
                      <div className="flex gap-1">
                        {b.round.numbers.map((n, i) => (
                          <div key={`${b.id}-${n}-${i}`} className="w-6 h-6 rounded-full bg-white/10 grid place-items-center text-[10px]">{n}</div>
                        ))}
                      </div>
                      <span>特 {b.round.special}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-4">
            <div className="font-bold">歷史開獎</div>
            <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.length === 0 && <div className="text-sm text-white/60">尚無資料</div>}
              {history.map((h) => (
                <div key={`${h.day}-${h.code}`} className="glass p-3">
                  <div className="text-xs text-white/60">台北日 {new Date(h.day).toLocaleDateString()} · 第 {h.code} 期 · {new Date(h.drawAt).toLocaleTimeString()}</div>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {h.numbers.map((n, i) => (
                      <div key={`${h.code}-${n}-${i}`} className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">{n}</div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm">特別號：<span className="font-bold">{h.special}</span></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <Confetti fire={fireConfetti} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
