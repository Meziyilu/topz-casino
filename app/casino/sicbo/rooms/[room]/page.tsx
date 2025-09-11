"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Phase = "BETTING" | "REVEALING" | "SETTLED";
type Room = "SB_R30" | "SB_R60" | "SB_R90";
type Kind =
  | "BIG" | "SMALL" | "ODD" | "EVEN"
  | "ANY_TRIPLE" | "SPECIFIC_TRIPLE" | "SPECIFIC_DOUBLE"
  | "TOTAL" | "COMBINATION" | "SINGLE_DIE";

type StateResp = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; endedAt?: string; dice: number[] };
  config: { drawIntervalSec: number; lockBeforeRollSec: number };
  timers: { lockInSec: number; endInSec: number };
  serverTime: string;
  locked: boolean;
};

const TOTAL_PAYOUT: Record<number, number> = {
  4: 50, 17: 50,
  5: 18, 16: 18,
  6: 14, 15: 14,
  7: 12, 14: 12,
  8: 8,  13: 8,
  9: 6,  12: 6,
  10: 6, 11: 6,
};

const CHIP_PRESETS = [10, 100, 1000, 5000];

function cx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }
function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec)); const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2,"0")}`;
}

export default function SicboRoomPage() {
  const params = useParams<{ room: Room }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room>("SB_R30");
  const [state, setState] = useState<StateResp | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState(false);
  const [userId, setUserId] = useState<string>("demo-user"); // ⚠️ 無驗證：前端自行指定/輸入

  useEffect(() => {
    const r = (params?.room?.toString()?.toUpperCase() as Room) || "SB_R30";
    setRoom(["SB_R30","SB_R60","SB_R90"].includes(r) ? r : "SB_R30");
  }, [params?.room]);

  async function fetchState() {
    const res = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }
  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 3000);
    return () => clearInterval(t);
  }, [room]);

  async function place(kind: Kind, payload?: any) {
    if (!state || state.locked || placing || chip <= 0) return;
    setPlacing(true);
    try {
      const res = await fetch(`/api/casino/sicbo/bet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, room, kind, amount: chip, payload }),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || "下注失敗");
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setPlacing(false);
      fetchState();
    }
  }

  const lockLeft = state?.timers?.lockInSec ?? 0;
  const endLeft  = state?.timers?.endInSec  ?? 0;

  // 建 15 組兩數組合
  const pairs: [number, number][] = [];
  for (let a=1;a<=6;a++) for (let b=a+1;b<=6;b++) pairs.push([a,b]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold">SicBo 骰寶</h1>
        <div className="ml-2 text-sm opacity-80">User: </div>
        <input
          value={userId}
          onChange={e=>setUserId(e.target.value)}
          className="px-2 py-1 rounded border border-white/10 bg-black/30"
          placeholder="userId"
        />
        <div className="ml-auto flex gap-2">
          {(["SB_R30","SB_R60","SB_R90"] as Room[]).map(r=>(
            <button key={r} onClick={()=>router.push(`/casino/sicbo/rooms/${r}`)}
              className={cx("px-3 py-1 rounded-xl border", r===room ? "bg-black/80 text-white border-white/20" : "bg-white/5 border-white/10")}>
              {r.replace("SB_","")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <InfoCard title="房間" value={room} />
        <InfoCard title="局號" value={state?.round?.id?.slice(-6) ?? "-"} />
        <InfoCard title="狀態" value={state?.round?.phase ?? "-"} />
        <InfoCard title="封盤/結束" value={`${fmtTime(lockLeft)} / ${fmtTime(endLeft)}`} />
      </div>

      {/* 賭盤 */}
      <div className="bg-emerald-900/10 border border-emerald-400/20 rounded-2xl p-3 md:p-4">
        {/* 小 / 總和 / 大 */}
        <div className="grid grid-cols-12 gap-2">
          <BoardButton className="col-span-2 bg-emerald-800/40"
            disabled={!!state?.locked || placing || chip<=0}
            onClick={()=>place("SMALL")}
            label={<CellLabel title="SMALL" big="小" note="4–10｜1賠1\n三同視為輸" align="left" />}
          />
          <div className="col-span-8 grid grid-cols-14 gap-2">
            {Array.from({length:14},(_,i)=>i+4).map(total=>(
              <BoardButton key={total}
                disabled={!!state?.locked || placing || chip<=0}
                onClick={()=>place("TOTAL",{ total })}
                label={
                  <div className="text-center">
                    <div className="text-xl font-bold">{total}</div>
                    <div className="text-[11px] opacity-80">1賠{TOTAL_PAYOUT[total]}</div>
                  </div>
                }
              />
            ))}
          </div>
          <BoardButton className="col-span-2 bg-emerald-800/40"
            disabled={!!state?.locked || placing || chip<=0}
            onClick={()=>place("BIG")}
            label={<CellLabel title="BIG" big="大" note="11–17｜1賠1\n三同視為輸" align="right" />}
          />
        </div>

        {/* 單 / 雙 */}
        <div className="grid grid-cols-12 gap-2 mt-2">
          <BoardButton className="col-span-6"
            disabled={!!state?.locked || placing || chip<=0}
            onClick={()=>place("ODD")}
            label={<div className="text-center"><div className="text-xl font-bold">單</div><div className="text-[11px] opacity-80">1賠1（三同輸）</div></div>}
          />
          <BoardButton className="col-span-6"
            disabled={!!state?.locked || placing || chip<=0}
            onClick={()=>place("EVEN")}
            label={<div className="text-center"><div className="text-xl font-bold">雙</div><div className="text-[11px] opacity-80">1賠1（三同輸）</div></div>}
          />
        </div>

        {/* 指定雙 / 任意豹子 / 指定豹子 */}
        <div className="grid grid-cols-12 gap-2 mt-2">
          <div className="col-span-5 grid grid-cols-6 gap-2">
            {Array.from({length:6},(_,i)=>i+1).map(n=>(
              <BoardButton key={`d${n}`}
                disabled={!!state?.locked || placing || chip<=0}
                onClick={()=>place("SPECIFIC_DOUBLE",{ eye:n })}
                label={<div className="text-center"><div className="text-sm">雙 {n}{n}</div><div className="text-[11px] opacity-80">1賠8</div></div>}
              />
            ))}
          </div>
          <BoardButton className="col-span-2 bg-amber-500/20"
            disabled={!!state?.locked || placing || chip<=0}
            onClick={()=>place("ANY_TRIPLE")}
            label={<div className="text-center"><div className="text-sm font-semibold">任意豹子</div><div className="text-[11px] opacity-80">1賠30</div></div>}
          />
          <div className="col-span-5 grid grid-cols-6 gap-2">
            {Array.from({length:6},(_,i)=>i+1).map(n=>(
              <BoardButton key={`t${n}`}
                disabled={!!state?.locked || placing || chip<=0}
                onClick={()=>place("SPECIFIC_TRIPLE",{ eye:n })}
                label={<div className="text-center"><div className="text-sm">豹子 {n}{n}{n}</div><div className="text-[11px] opacity-80">1賠150</div></div>}
              />
            ))}
          </div>
        </div>

        {/* 兩數組合 15 格 */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mt-2">
          {pairs.map(([a,b])=>(
            <BoardButton key={`p${a}${b}`}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("COMBINATION",{ a,b })}
              label={<div className="text-center"><div className="text-sm">{a} + {b}</div><div className="text-[11px] opacity-80">1賠5</div></div>}
            />
          ))}
        </div>

        {/* 單骰 1..6 */}
        <div className="grid grid-cols-6 gap-2 mt-2">
          {Array.from({length:6},(_,i)=>i+1).map(n=>(
            <BoardButton key={`s${n}`}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("SINGLE_DIE",{ eye:n })}
              label={<div className="text-center"><div className="text-lg font-semibold">{n}</div><div className="text-[11px] opacity-80">中1×2 / 2×3 / 3×4</div></div>}
            />
          ))}
        </div>

        {state?.locked && <div className="mt-3 text-center text-sm text-red-200">已封盤，請等待下一局</div>}
      </div>

      {/* 籌碼列 */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm opacity-80">籌碼</span>
        {CHIP_PRESETS.map(c=>(
          <button key={c} onClick={()=>setChip(c)}
            className={cx("px-3 py-2 rounded-xl border", chip===c ? "bg-white/20 border-white/40" : "bg-white/5 border-white/10")}>
            {c}
          </button>
        ))}
        <button className="ml-2 px-3 py-2 rounded-xl border border-white/10" onClick={()=>setChip(v=>v*2)}>x2</button>
      </div>
    </div>
  );
}

function BoardButton({
  label, onClick, disabled, className,
}: { label: React.ReactNode; onClick?: ()=>void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-xl border p-2 md:p-3 h-[64px] md:h-[74px] flex items-center justify-center text-white",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:border-white/40 hover:bg-white/10",
        "bg-white/5 border-white/10",
        className
      )}
    >
      {label}
    </button>
  );
}

function CellLabel({ title, big, note, align }: { title: string; big: string; note: string; align: "left"|"right" }) {
  return (
    <div className={cx("text-left", align==="right" && "text-right")}>
      <div className="text-xs opacity-80">{title}</div>
      <div className="text-2xl font-bold whitespace-nowrap">{big}</div>
      <div className="text-[11px] opacity-80 whitespace-pre-line">{note}</div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-3 bg-white/5 border-white/10">
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
