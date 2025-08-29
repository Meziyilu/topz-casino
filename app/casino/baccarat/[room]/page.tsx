// app/casino/[room]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FlipTile from "@/components/FlipTile";

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
    } catch (e:any) { setMsg(e.message || "載入失敗"); setLoading(false); }
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
    return { BETTING:"下注中", REVEALING:"開牌中", SETTLED:"已結算" }[state.phase];
  }, [state]);

  const progress = useMemo(()=>{
    if(!state) return 0;
    const dur = state.room.durationSeconds;
    if (state.phase === "BETTING") return (1 - state.secLeft / dur) * 100;
    if (state.phase === "REVEALING") return 100;
    return 0;
  },[state]);

  async function place(side: Side) {
    if (!state) return;
    if (state.phase !== "BETTING") { setMsg("非下注時間"); return; }
    if (!betAmt || betAmt <= 0) { setMsg("金額必須 > 0"); return; }
    try {
      setPlacing(side); setMsg(null);
      const r = await fetch("/api/casino/baccarat/bet", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ roundId: state.roundId, side, amount: betAmt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "下注失敗");
      setMsg(`下注成功（#${d.betId?.slice(0,6) || ""}）`);
      refresh();
    } catch (e:any) { setMsg(e.message || "下注失敗"); } finally { setPlacing(null); }
  }

  const flipped = state?.phase !== "BETTING"; // REVEALING/SETTLED => 翻牌
  const outcomeColor = (o?: "PLAYER"|"BANKER"|"TIE"|null) =>
    o==="PLAYER" ? "text-cyan-300" : o==="BANKER" ? "text-rose-300" : o==="TIE" ? "text-amber-300" : "text-white/80";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0b0f1a] via-[#0a0a0f] to-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={()=>router.push("/lobby")}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition">
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
        {/* 左：資訊 + 翻牌 */}
        <section className="lg:col-span-2 glass glow-ring rounded-3xl p-6 shadow-2xl">
          {loading && <div className="text-white/70">載入中…</div>}
          {!loading && state && (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <InfoTile label="局序" value={`#${String(state.roundSeq).padStart(4,"0")}`} />
                <InfoTile label="狀態" value={statusText} />
                <CountdownTile secLeft={state.secLeft} total={state.room.durationSeconds} />
              </div>

              {/* 翻牌區（閒 / 莊） */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <FlipTile
                  flipped={flipped}
                  className="h-28"
                  front={<div className="text-center">
                    <div className="dot dot-player mr-2 align-middle"></div>
                    <span className="align-middle text-sm text-white/70">PLAYER</span>
                    <div className="mt-2 text-white/50 text-xs">等待開牌…</div>
                  </div>}
                  back={<div className="text-center">
                    <div className="text-xs text-white/60">PLAYER</div>
                    <div className="mt-1 text-3xl font-extrabold text-cyan-300">{state.result?.p ?? "-"}</div>
                  </div>}
                />
                <FlipTile
                  flipped={flipped}
                  className="h-28"
                  front={<div className="text-center">
                    <div className="dot dot-banker mr-2 align-middle"></div>
                    <span className="align-middle text-sm text-white/70">BANKER</span>
                    <div className="mt-2 text-white/50 text-xs">等待開牌…</div>
                  </div>}
                  back={<div className="text-center">
                    <div className="text-xs text-white/60">BANKER</div>
                    <div className="mt-1 text-3xl font-extrabold text-rose-300">{state.result?.b ?? "-"}</div>
                  </div>}
                />
              </div>

              {/* 結果徽章 */}
              {state.result && (
                <div className="mt-4 text-sm">
                  本局結果：
                  <span className={`font-bold ml-1 ${outcomeColor(state.result.outcome)}`}>
                    {state.result.outcome}
                  </span>
                  <span className="ml-2 text-white/60">（P {state.result.p ?? "-"} / B {state.result.b ?? "-" }）</span>
                </div>
              )}

              {/* 下注面板 */}
              <div className="mt-8">
                <div className="text-white/80 font-semibold">下注面板</div>
                <div className="mt-3 grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {SIDES.map((s) => (
                    <button key={s} onClick={()=>place(s)} disabled={placing===s || state.phase!=="BETTING"}
                      className="glass rounded-2xl px-4 py-3 text-left hover:bg-white/10 active:scale-[.99] transition disabled:opacity-50">
                      <div className="text-sm font-semibold">{labelOf(s)}</div>
                      <div className="text-xs text-white/60">我已下：{(state.myBets?.[s] ?? 0).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <label className="flex-1">
                    <div className="text-xs text-white/70">金額</div>
                    <input type="number" min={1} value={betAmt}
                      onChange={e=>setBetAmt(parseInt(e.currentTarget.value || "0",10))}
                      className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400/60" />
                  </label>
                  <div className="text-sm text-cyan-300 min-h-[1.5rem]">{msg}</div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 右：近 20 局路子 */}
        <section className="glass glow-ring rounded-3xl p-6 shadow-2xl">
          <div className="text-white/80 font-semibold">近 20 局</div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {!loading && state?.recent?.length
              ? state.recent.map((r) => (
                  <div key={r.roundSeq} className="glass rounded-xl px-2 py-2 text-center" title={`#${r.roundSeq} P:${r.p} / B:${r.b}`}>
                    <div className="text-[10px] text-white/50">#{String(r.roundSeq).padStart(4,"0")}</div>
                    <div className={`mt-1 text-xs font-bold ${r.outcome==="PLAYER"?"text-cyan-300":r.outcome==="BANKER"?"text-rose-300":"text-amber-300"}`}>{r.outcome}</div>
                  </div>
                ))
              : <div className="text-white/60 text-sm">尚無資料</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoTile({ label, value }: { label:string; value:string; }) {
  return (
    <div className="glass rounded-2xl px-4 py-2">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function CountdownTile({ secLeft, total }:{ secLeft:number; total:number; }) {
  const pct = Math.max(0, Math.min(100, (1 - secLeft / total) * 100));
  const ring = `conic-gradient(#22d3ee ${pct}%, rgba(255,255,255,.15) ${pct}% 100%)`;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full" style={{ background: ring }} />
        <div className="absolute inset-1 rounded-full bg-black/60 backdrop-blur" />
        <div className="absolute inset-0 grid place-items-center text-sm font-semibold">{secLeft}s</div>
      </div>
      <div>
        <div className="text-xs text-white/60">倒數</div>
        <div className="text-xl font-bold">{secLeft}s</div>
      </div>
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
