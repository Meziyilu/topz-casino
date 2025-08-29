// app/casino/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Phase = "BETTING" | "REVEALING" | "SETTLED";
type Side = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

type StateResp = {
  room: { code: string; name: string; durationSeconds: number };
  day: string;
  roundId: string;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: "PLAYER" | "BANKER" | "TIE"; p: number | null; b: number | null };
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: "PLAYER" | "BANKER" | "TIE"; p: number; b: number }[];
};

const SIDES: Side[] = ["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"];

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ room: string }>();
  const roomCode = String(params.room || "R60").toUpperCase();

  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [betAmt, setBetAmt] = useState(100);
  const [placing, setPlacing] = useState<Side | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch(`/api/casino/baccarat/state?room=${roomCode}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "載入失敗");
      setState(d);
      setLoading(false);
    } catch (e: any) {
      setMsg(e.message || "載入失敗");
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  const statusText = useMemo(() => {
    if (!state) return "";
    const m: Record<Phase, string> = {
      BETTING: "下注中",
      REVEALING: "開牌中",
      SETTLED: "已結算",
    };
    return m[state.phase];
  }, [state]);

  async function place(side: Side) {
    if (!state) return;
    if (state.phase !== "BETTING") {
      setMsg("非下注時間");
      return;
    }
    if (!betAmt || betAmt <= 0) {
      setMsg("金額必須 > 0");
      return;
    }
    try {
      setPlacing(side);
      setMsg(null);
      const r = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ roundId: state.roundId, side, amount: betAmt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "下注失敗");
      setMsg(`下注成功（#${d.betId?.slice(0, 6) || ""}）`);
      refresh();
    } catch (e: any) {
      setMsg(e.message || "下注失敗");
    } finally {
      setPlacing(null);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0b0f1a] via-[#0a0a0f] to-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/lobby")}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
          >
            ← 返回大廳
          </button>
          <div className="text-xl font-bold tracking-wider">
            {state ? state.room.name : roomCode}
            <span className="ml-2 text-sm text-white/60">房間 {roomCode}</span>
          </div>
        </div>
        <div className="text-sm text-white/70">TOPZCASINO</div>
      </div>

      <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-3 gap-6">
        {/* 資訊卡 */}
        <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-2xl">
          {loading && <div className="text-white/70">載入中…</div>}
          {!loading && state && (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                  <div className="text-xs text-white/60">局序</div>
                  <div className="text-xl font-bold">{String(state.roundSeq).padStart(4, "0")}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                  <div className="text-xs text-white/60">狀態</div>
                  <div className="text-xl font-bold">{statusText}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                  <div className="text-xs text-white/60">倒數</div>
                  <div className="text-xl font-bold">{state.secLeft}s</div>
                </div>
              </div>

              {/* 開牌結果（結算後顯示） */}
              {state.result && (
                <div className="mt-6">
                  <div className="text-white/70 text-sm">本局結果</div>
                  <div className="mt-2 flex items-center gap-4">
                    <Badge label="PLAYER" active={state.result.outcome === "PLAYER"} />
                    <Badge label="TIE" active={state.result.outcome === "TIE"} />
                    <Badge label="BANKER" active={state.result.outcome === "BANKER"} />
                    <div className="ml-auto text-white/70 text-sm">
                      點數：P {state.result.p ?? "-"} / B {state.result.b ?? "-"}
                    </div>
                  </div>
                </div>
              )}

              {/* 下注面板 */}
              <div className="mt-8">
                <div className="text-white/80 font-semibold">下注面板</div>
                <div className="mt-3 grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {SIDES.map((s) => (
                    <button
                      key={s}
                      onClick={() => place(s)}
                      disabled={placing === s || state.phase !== "BETTING"}
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left hover:bg-white/10 active:scale-[.99] transition disabled:opacity-50"
                    >
                      <div className="text-sm font-semibold">{labelOf(s)}</div>
                      <div className="text-xs text-white/60">
                        我已下：{(state.myBets?.[s] ?? 0).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-end gap-3">
                  <label className="flex-1">
                    <div className="text-xs text-white/70">金額</div>
                    <input
                      type="number"
                      min={1}
                      value={betAmt}
                      onChange={(e) => setBetAmt(parseInt(e.currentTarget.value || "0", 10))}
                      className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                    />
                  </label>
                  <div className="text-sm text-cyan-300 min-h-[1.5rem]">{msg}</div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 路子（近 20 局） */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-2xl">
          <div className="text-white/80 font-semibold">近 20 局</div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {!loading && state?.recent?.length
              ? state.recent.map((r) => (
                  <div
                    key={r.roundSeq}
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center"
                    title={`#${r.roundSeq} P:${r.p} / B:${r.b}`}
                  >
                    <div className="text-[10px] text-white/50">#{String(r.roundSeq).padStart(4, "0")}</div>
                    <div className={`mt-1 text-xs font-bold ${colorOf(r.outcome)}`}>
                      {r.outcome}
                    </div>
                  </div>
                ))
              : <div className="text-white/60 text-sm">尚無資料</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Badge({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-semibold border ${
        active
          ? "border-emerald-300 text-emerald-300 bg-emerald-300/10"
          : "border-white/20 text-white/70"
      }`}
    >
      {label}
    </div>
  );
}

function labelOf(s: Side) {
  switch (s) {
    case "PLAYER": return "閒家";
    case "BANKER": return "莊家";
    case "TIE": return "和局";
    case "PLAYER_PAIR": return "閒對";
    case "BANKER_PAIR": return "莊對";
    default: return s;
  }
}
function colorOf(o: "PLAYER" | "BANKER" | "TIE") {
  if (o === "PLAYER") return "text-cyan-300";
  if (o === "BANKER") return "text-rose-300";
  return "text-amber-300";
}
