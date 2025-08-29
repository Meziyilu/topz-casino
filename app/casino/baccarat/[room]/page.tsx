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
  cards?: { player: string[]; banker: string[] };
  reveal?: { order: string[]; showCount: number };
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: NonNullable<Outcome> | null; p: number; b: number }[];
};

const zhPhase: Record<Phase, string> = {
  BETTING: "下注中",
  REVEALING: "開牌中",
  SETTLED: "已結算",
};
const zhOutcome = { PLAYER: "閒", BANKER: "莊", TIE: "和" } as const;
const fmtOutcome = (o: Outcome) => (o ? zhOutcome[o] : "—");
const pad4 = (n: number) => n.toString().padStart(4, "0");

export default function RoomPage() {
  const { room } = useParams<{ room: string }>();
  const router = useRouter();

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<null | string>(null);
  const [err, setErr] = useState("");

  const [chip, setChip] = useState(50);
  const chips = [50, 100, 500, 1000];

  useEffect(() => {
    let t: any;
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/casino/baccarat/state?room=${room}`, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "載入失敗");
        if (mounted) { setData(j); setErr(""); }
      } catch (e: any) {
        if (mounted) setErr(e?.message || "連線失敗");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load(); t = setInterval(load, 1000);
    return () => { mounted = false; clearInterval(t); };
  }, [room]);

  const [localSec, setLocalSec] = useState(0);
  useEffect(() => { if (data) setLocalSec(data.secLeft); }, [data?.secLeft]);
  useEffect(() => {
    if (localSec <= 0) return;
    const t = setInterval(() => setLocalSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [localSec]);

  async function place(side: "PLAYER" | "BANKER" | "TIE") {
    if (!data) return;
    if (data.phase !== "BETTING") return setErr("目前非下注時間");
    setPlacing(side);
    try {
      const r = await fetch("/api/casino/baccarat/bet", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: data.room.code, side, amount: chip }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "下注失敗");
      setErr("");
    } catch (e: any) { setErr(e?.message || "下注失敗"); }
    finally { setPlacing(null); }
  }

  const outcome = useMemo<Outcome>(() => data?.result?.outcome ?? null, [data?.result]);
  const showCount = data?.reveal?.showCount ?? 0;
  const pCards = data?.cards?.player ?? [];
  const bCards = data?.cards?.banker ?? [];

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn glass tilt" onClick={() => router.push("/lobby")}>← 回大廳</button>
          <InfoPill label="房間" value={data?.room.name || String(room)} />
          <InfoPill label="局序" value={data ? pad4(data.roundSeq) : "--"} />
          <InfoPill label="狀態" value={data ? zhPhase[data.phase] : "載入中"} />
          <InfoPill label="倒數" value={typeof localSec === "number" ? `${localSec}s` : "--"} />
        </div>
        <div className="text-right">
          {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
          <div className="opacity-70 text-xs">（時間以伺服器為準）</div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6 pb-16">
        {/* 左半：下注 + 翻牌 */}
        <div className="md:col-span-2">
          <div className="glass glow-ring p-6 rounded-2xl sheen">
            <div className="text-xl font-bold mb-4">下注面板</div>

            {/* 籌碼選擇 */}
            <div className="mb-4">
              <div className="text-sm opacity-80 mb-2">選擇籌碼：</div>
              <div className="flex gap-3 flex-wrap">
                {chips.map((c) => (
                  <button
                    key={c}
                    onClick={() => setChip(c)}
                    className={`px-5 py-2 rounded-full border ${chip === c ? "bg-white/20 border-white" : "bg-white/5 border-white/30"}`}
                  >
                    ${c.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 下注按鈕 */}
            <div className="grid grid-cols-3 gap-4">
              <BetBtn disabled={placing==="PLAYER"||data?.phase!=="BETTING"} onClick={()=>place("PLAYER")} label='壓「閒」' mine={data?.myBets?.PLAYER}/>
              <BetBtn disabled={placing==="TIE"||data?.phase!=="BETTING"} onClick={()=>place("TIE")} label='壓「和」' mine={data?.myBets?.TIE}/>
              <BetBtn disabled={placing==="BANKER"||data?.phase!=="BETTING"} onClick={()=>place("BANKER")} label='壓「莊」' mine={data?.myBets?.BANKER}/>
            </div>

            {/* 翻牌 */}
            <div className="mt-8">
              <div className="text-sm opacity-80 mb-2">
                {data?.phase==="BETTING"?"等待下注結束…":data?.phase==="REVEALING"?"開牌中…":"本局結果"}
              </div>

              {/* 兩列：閒 / 莊 */}
              <div className="grid gap-4">
                <Row label="閒" active={outcome==="PLAYER"}>
                  <CardFlip idx={1} showCount={showCount} face={pCards[0]} />
                  <CardFlip idx={3} showCount={showCount} face={pCards[1]} />
                  <CardFlip idx={5} showCount={showCount} face={pCards[2]} />
                </Row>
                <Row label="莊" active={outcome==="BANKER"}>
                  <CardFlip idx={2} showCount={showCount} face={bCards[0]} />
                  <CardFlip idx={4} showCount={showCount} face={bCards[1]} />
                  <CardFlip idx={6} showCount={showCount} face={bCards[2]} />
                </Row>
              </div>

              {data?.phase==="SETTLED" && (
                <div className="mt-3 text-lg">結果：<span className="font-bold">{fmtOutcome(outcome)}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* 右半：路子 */}
        <div>
          <div className="glass glow-ring p-6 rounded-2xl">
            <div className="text-xl font-bold mb-4">路子（近 20 局）</div>
            <div className="grid grid-cols-10 gap-2">
              {(data?.recent ?? []).map((r) => (
                <div key={r.roundSeq}
                  className="h-6 rounded flex items-center justify-center text-[10px]"
                  style={{
                    background: r.outcome==="PLAYER"?"rgba(103,232,249,.25)":r.outcome==="BANKER"?"rgba(253,164,175,.25)":"rgba(253,230,138,.25)",
                    border: r.outcome==="PLAYER"?"1px solid rgba(103,232,249,.6)":r.outcome==="BANKER"?"1px solid rgba(253,164,175,.6)":"1px solid rgba(253,230,138,.6)",
                  }}
                  title={`#${pad4(r.roundSeq)}：${fmtOutcome(r.outcome)}  閒${r.p} / 莊${r.b}`}
                >
                  {r.outcome ? zhOutcome[r.outcome] : "—"}
                </div>
              ))}
              {data && data.recent.length===0 && <div className="opacity-60 text-sm">暫無資料</div>}
            </div>

            <div className="mt-4 max-h-64 overflow-auto text-sm">
              <table className="w-full text-left opacity-90">
                <thead className="opacity-70"><tr><th className="py-1 pr-2">局序</th><th className="py-1 pr-2">結果</th><th className="py-1 pr-2">閒點</th><th className="py-1 pr-2">莊點</th></tr></thead>
                <tbody>
                  {(data?.recent ?? []).map((r) => (
                    <tr key={`t-${r.roundSeq}`} className="border-t border-white/10">
                      <td className="py-1 pr-2">{pad4(r.roundSeq)}</td>
                      <td className="py-1 pr-2">{fmtOutcome(r.outcome)}</td>
                      <td className="py-1 pr-2">{r.p}</td>
                      <td className="py-1 pr-2">{r.b}</td>
                    </tr>
                  ))}
                  {data && data.recent.length===0 && (
                    <tr><td colSpan={4} className="py-2 opacity-60">暫無資料</td></tr>
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass px-4 py-2 rounded-xl">
      <div className="text-sm opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function BetBtn({ disabled, onClick, label, mine }: { disabled?: boolean; onClick: () => void; label: string; mine?: number; }) {
  return (
    <button disabled={disabled} onClick={onClick} className="btn shimmer disabled:opacity-50">
      {label}{!!mine && <span className="ml-2 text-xs opacity-80">（我: {mine}）</span>}
    </button>
  );
}

/** 單張卡的翻牌：idx=1..6 對應 P1,B1,P2,B2,P3,B3；showCount>=idx 才翻開 */
function CardFlip({ idx, showCount, face }: { idx: number; showCount: number; face?: string; }) {
  const flipped = showCount >= idx;
  const label = face ? renderFace(face) : "?";
  return (
    <div className="flip-3d h-28 w-24">
      <div className="flip-inner" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
        <div className="flip-front glass flex items-center justify-center text-xl font-bold">?</div>
        <div className="flip-back flex items-center justify-center text-xl font-extrabold rounded-2xl"
          style={{ background:"linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))", border:"1px solid rgba(255,255,255,.25)" }}>
          {flipped ? label : " "}
        </div>
      </div>
    </div>
  );
}

/** 把 "9S" 轉成更友善的「9♠」 */
function renderFace(face: string) {
  if (!face) return "?";
  const suit = face.slice(-1);
  const rank = face.slice(0, -1);
  const sym = suit === "S" ? "♠" : suit === "H" ? "♥" : suit === "D" ? "♦" : "♣";
  return `${rank}${sym}`;
}

/** 行（閒 / 莊）容器 */
function Row({ label, active, children }: { label: "閒" | "莊"; active?: boolean; children: React.ReactNode; }) {
  return (
    <div className={`p-4 rounded-xl border ${active ? "border-white/60 shadow-[0_0_20px_rgba(255,255,255,.15)]" : "border-white/20"}`}>
      <div className="mb-2 font-semibold">{label}</div>
      <div className="flex gap-3">{children}</div>
    </div>
  );
}
