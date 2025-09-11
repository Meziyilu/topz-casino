"use client";

import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
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

const CHIP_PRESETS = [
  { v: 10,   cls: "chip chip--red"    },
  { v: 100,  cls: "chip chip--blue"   },
  { v: 1000, cls: "chip chip--purple" },
  { v: 5000, cls: "chip chip--black"  },
];

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
  const [userId, setUserId] = useState<string>("demo-user"); // 無驗證：自填

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

  // 組合（15格）
  const pairs: [number, number][] = useMemo(() => {
    const out: [number, number][] = [];
    for (let a=1;a<=6;a++) for (let b=a+1;b<=6;b++) out.push([a,b]);
    return out;
  }, []);

  const renderDiceRow = () => {
    const phase = state?.round?.phase;
    const dice = state?.round?.dice || [];
    const rolling = phase === "REVEALING" || (phase === "BETTING" && lockLeft === 0 && endLeft > 0);
    // 顯示三顆
    return (
      <div className="flex items-center gap-2">
        {Array.from({length:3},(_,i)=>(
          <Dice key={i} n={dice[i]} rolling={rolling && !dice[i]} size="lg" />
        ))}
      </div>
    );
  };

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/sicbo.css" />
      </Head>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* 頂部列 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h1 className="text-2xl font-bold">SicBo 骰寶</h1>
          <div className="ml-2 text-sm opacity-80">User:</div>
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

        {/* 狀態列 + 骰子 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <InfoCard title="房間" value={room} />
          <InfoCard title="局號" value={state?.round?.id?.slice(-6) ?? "-"} />
          <InfoCard title="狀態" value={state?.round?.phase ?? "-"} />
          <InfoCard title="封盤" value={fmtTime(lockLeft)} />
          <InfoCard title="結束" value={fmtTime(endLeft)} />
        </div>
        <div className="mb-4">
          {renderDiceRow()}
        </div>

        {/* ===== 賭盤 ===== */}
        <div className="sicbo-board">
          {/* 小 / 總和 / 大 */}
          <div className="grid grid-cols-12 gap-2">
            <button
              className={cx("sicbo-cell sicbo-cell--accent col-span-2", (state?.locked || placing || chip<=0) && "disabled")}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("SMALL")}
            >
              <CellLabel title="SMALL" big="小" note="4–10｜1賠1\n三同視為輸" align="left" />
            </button>

            <div className="col-span-8 grid grid-cols-14 gap-2">
              {Array.from({length:14},(_,i)=>i+4).map(total=>(
                <button key={total}
                  className={cx("sicbo-cell", (state?.locked || placing || chip<=0) && "disabled")}
                  disabled={!!state?.locked || placing || chip<=0}
                  onClick={()=>place("TOTAL",{ total })}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold">{total}</div>
                    <div className="text-[11px] opacity-80">1賠{TOTAL_PAYOUT[total]}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              className={cx("sicbo-cell sicbo-cell--accent col-span-2", (state?.locked || placing || chip<=0) && "disabled")}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("BIG")}
            >
              <CellLabel title="BIG" big="大" note="11–17｜1賠1\n三同視為輸" align="right" />
            </button>
          </div>

          {/* 單 / 雙 */}
          <div className="grid grid-cols-12 gap-2 mt-2">
            <button
              className={cx("sicbo-cell col-span-6", (state?.locked || placing || chip<=0) && "disabled")}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("ODD")}
            >
              <div className="text-center">
                <div className="text-xl font-bold">單</div>
                <div className="text-[11px] opacity-80">1賠1（三同輸）</div>
              </div>
            </button>
            <button
              className={cx("sicbo-cell col-span-6", (state?.locked || placing || chip<=0) && "disabled")}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("EVEN")}
            >
              <div className="text-center">
                <div className="text-xl font-bold">雙</div>
                <div className="text-[11px] opacity-80">1賠1（三同輸）</div>
              </div>
            </button>
          </div>

          {/* 指定雙 / 任意豹子 / 指定豹子 */}
          <div className="grid grid-cols-12 gap-2 mt-2">
            <div className="col-span-5 grid grid-cols-6 gap-2">
              {Array.from({length:6},(_,i)=>i+1).map(n=>(
                <button key={`d${n}`}
                  className={cx("sicbo-cell", (state?.locked || placing || chip<=0) && "disabled")}
                  disabled={!!state?.locked || placing || chip<=0}
                  onClick={()=>place("SPECIFIC_DOUBLE",{ eye:n })}
                >
                  <div className="text-center">
                    <div className="text-sm">雙 {n}{n}</div>
                    <div className="text-[11px] opacity-80">1賠8</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              className={cx("sicbo-cell sicbo-cell--triple col-span-2", (state?.locked || placing || chip<=0) && "disabled")}
              disabled={!!state?.locked || placing || chip<=0}
              onClick={()=>place("ANY_TRIPLE")}
            >
              <div className="text-center">
                <div className="text-sm font-semibold">任意豹子</div>
                <div className="text-[11px] opacity-80">1賠30</div>
              </div>
            </button>

            <div className="col-span-5 grid grid-cols-6 gap-2">
              {Array.from({length:6},(_,i)=>i+1).map(n=>(
                <button key={`t${n}`}
                  className={cx("sicbo-cell", (state?.locked || placing || chip<=0) && "disabled")}
                  disabled={!!state?.locked || placing || chip<=0}
                  onClick={()=>place("SPECIFIC_TRIPLE",{ eye:n })}
                >
                  <div className="text-center">
                    <div className="text-sm">豹子 {n}{n}{n}</div>
                    <div className="text-[11px] opacity-80">1賠150</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 兩數組合 15 格 */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mt-2">
            {pairs.map(([a,b])=>(
              <button key={`p${a}${b}`}
                className={cx("sicbo-cell", (state?.locked || placing || chip<=0) && "disabled")}
                disabled={!!state?.locked || placing || chip<=0}
                onClick={()=>place("COMBINATION",{ a,b })}
              >
                <div className="text-center">
                  <div className="text-sm">{a} + {b}</div>
                  <div className="text-[11px] opacity-80">1賠5</div>
                </div>
              </button>
            ))}
          </div>

          {/* 單骰 1..6 */}
          <div className="grid grid-cols-6 gap-2 mt-2">
            {Array.from({length:6},(_,i)=>i+1).map(n=>(
              <button key={`s${n}`}
                className={cx("sicbo-cell", (state?.locked || placing || chip<=0) && "disabled")}
                disabled={!!state?.locked || placing || chip<=0}
                onClick={()=>place("SINGLE_DIE",{ eye:n })}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">{n}</div>
                  <div className="text-[11px] opacity-80">中1×2 / 2×3 / 3×4</div>
                </div>
              </button>
            ))}
          </div>

          {state?.locked && <div className="mt-3 text-center text-sm text-red-200">已封盤，請等待下一局</div>}
        </div>

        {/* 籌碼列 */}
        <div className="mt-4 chips">
          <span className="text-sm opacity-80">籌碼</span>
          {CHIP_PRESETS.map(c=>(
            <button key={c.v}
              onClick={()=>setChip(c.v)}
              className={cx(c.cls, chip===c.v && "selected")}
              title={`${c.v}`}
            >
              {c.v}
            </button>
          ))}
          <button
            className="ml-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5"
            onClick={()=>setChip(v=>v*2)}>
            x2
          </button>
        </div>

        {/* 歷史（小骰 + Sum + 三同） */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">近 20 局</div>
            <button onClick={fetchState} className="px-3 py-1 text-sm rounded-md border border-white/10">刷新</button>
          </div>
          <HistoryGrid room={room} />
        </div>
      </div>
    </>
  );
}

/* ============ 小元件們 ============ */

function HistoryGrid({ room }: { room: Room }) {
  const [items, setItems] = useState<{ id: string; dice: number[]; endedAt: string }[]>([]);

  async function load() {
    const res = await fetch(`/api/casino/sicbo/history?room=${room}&limit=20`, { cache: "no-store" });
    if (!res.ok) return;
    const js = await res.json();
    setItems(js.items || []);
  }
  useEffect(() => { load(); }, [room]);

  const isTriple = (d: number[]) => d[0]===d[1] && d[1]===d[2];
  const sum = (d: number[]) => (d[0]||0)+(d[1]||0)+(d[2]||0);

  return (
    <div className="grid md:grid-cols-4 gap-2">
      {items?.length ? items.map(h => (
        <div key={h.id} className="border border-white/10 rounded-xl p-3">
          <div className="text-xs opacity-70 mb-1">{new Date(h.endedAt).toLocaleString()}</div>
          <div className="flex items-center gap-2 mb-1">
            <Dice n={h.dice[0]} size="sm" />
            <Dice n={h.dice[1]} size="sm" />
            <Dice n={h.dice[2]} size="sm" />
          </div>
          <div className="text-sm">Sum: <b>{sum(h.dice)}</b> {isTriple(h.dice) ? <span className="ml-1 text-amber-300">三同</span> : null}</div>
        </div>
      )) : <div className="text-sm opacity-60">尚無歷史</div>}
    </div>
  );
}

function Dice({ n, rolling, size = "md" }: { n?: number; rolling?: boolean; size?: "sm"|"md"|"lg" }) {
  // n=1..6 顯示點數；若 rolling=true 或 n 未定，套用動畫
  const faceCls = n ? `face-${n}` : "";
  const sizeCls = size === "sm" ? "dice-sm" : size === "lg" ? "dice-lg" : "";
  const rollingCls = rolling ? "rolling" : "";
  return (
    <div className={cx("dice", faceCls, sizeCls, rollingCls)}>
      <span className="pip p1"></span>
      <span className="pip p2"></span>
      <span className="pip p3"></span>
      <span className="pip p4"></span>
      <span className="pip p5"></span>
      <span className="pip p6"></span>
      <span className="pip p7"></span>
      <span className="pip p8"></span>
      <span className="pip p9"></span>
    </div>
  );
}

function CellLabel({ title, big, note, align }: { title: string; big: string; note: string; align: "left"|"right" }) {
  return (
    <div className={cx(align==="right" ? "text-right" : "text-left")}>
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
