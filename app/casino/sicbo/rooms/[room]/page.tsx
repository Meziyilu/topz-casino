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
  const [amount, setAmount] = useState<number>(100);
  const [placing, setPlacing] = useState(false);
  const [userId, setUserId] = useState<string>("demo-user"); // 無驗證：自填
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const r = (params?.room?.toString()?.toUpperCase() as Room) || "SB_R30";
    setRoom(["SB_R30","SB_R60","SB_R90"].includes(r) ? r : "SB_R30");
  }, [params?.room]);

  async function fetchState() {
    const res = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }
  async function fetchBalance() {
    if (!userId) return;
    const res = await fetch(`/api/wallet/balance?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
    if (res.ok) {
      const js = await res.json();
      setBalance(js.balance ?? 0);
    }
  }
  useEffect(() => {
    fetchState(); fetchBalance();
    const t1 = setInterval(fetchState, 3000);
    const t2 = setInterval(fetchBalance, 5000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [room, userId]);

  useEffect(() => { setAmount(chip); }, [chip]);

  async function place(kind: Kind, payload?: any) {
    if (!state || state.locked || placing || amount <= 0) return;
    setPlacing(true);
    try {
      const res = await fetch(`/api/casino/sicbo/bet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, room, kind, amount, payload }),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || "下注失敗");
      await fetchBalance();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setPlacing(false);
      fetchState();
    }
  }

  async function refundThisRound() {
    if (!state?.round?.id) return;
    if (state.locked) return alert("已封盤，無法返金本局投注");
    const res = await fetch(`/api/wallet/refund-round`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, roundId: state.round.id }),
    });
    const js = await res.json();
    if (!res.ok) return alert(js?.error || "返金失敗");
    alert(`已返金：${js.refunded} 元`);
    fetchBalance();
    fetchState();
  }

  const lockLeft = state?.timers?.lockInSec ?? 0;
  const endLeft  = state?.timers?.endInSec  ?? 0;

  const pairs: [number, number][] = useMemo(() => {
    const out: [number, number][] = [];
    for (let a=1;a<=6;a++) for (let b=a+1;b<=6;b++) out.push([a,b]);
    return out;
  }, []);

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/sicbo.css" />
      </Head>

      <div className="sicbo-wrapper">
        {/* 頂部工具列（玻璃） */}
        <div className="topbar glass">
          <div className="left">
            <button className="btn btn--ghost" onClick={() => router.push("/casino/sicbo")}>← 返回</button>
            <div className="room-pill">{room.replace("SB_","")}</div>
          </div>
          <div className="right">
            <div className="wallet">
              <span className="label">餘額</span>
              <span className="val">${balance.toLocaleString()}</span>
            </div>
            <div className="amount">
              <span className="label">下注金額</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={e=>setAmount(Math.max(1, Number(e.target.value || 0)))}
              />
            </div>
            <input
              className="user-input"
              value={userId}
              onChange={e=>setUserId(e.target.value)}
              placeholder="userId"
              title="測試：無驗證直接指定使用者"
            />
            <button className="btn btn--amber" onClick={refundThisRound} disabled={state?.locked}>返金本局</button>
          </div>
        </div>

        {/* 賭桌＋資訊都包在綠色面板內 */}
        <div className="sicbo-board">

          {/* 狀態列（玻璃資訊卡） */}
          <div className="info-grid">
            <InfoCard title="局號" value={state?.round?.id?.slice(-6) ?? "-"} />
            <InfoCard title="狀態" value={state?.round?.phase ?? "-"} />
            <InfoCard title="封盤" value={fmtTime(lockLeft)} />
            <InfoCard title="結束" value={fmtTime(endLeft)} />
            <div className="dice-stack">
              <Dice n={state?.round?.dice?.[0]} rolling={state?.round?.phase==="REVEALING" && !state?.round?.dice?.[0]} size="lg" />
              <Dice n={state?.round?.dice?.[1]} rolling={state?.round?.phase==="REVEALING" && !state?.round?.dice?.[1]} size="lg" />
              <Dice n={state?.round?.dice?.[2]} rolling={state?.round?.phase==="REVEALING" && !state?.round?.dice?.[2]} size="lg" />
            </div>
          </div>

          {/* === 下注面板（完全置中並包含於綠色面板） === */}
          {/* 小 / 總和 / 大 */}
          <div className="grid grid-cols-12 gap-2">
            <button
              className={cx("sicbo-cell sicbo-cell--accent col-span-2", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("SMALL")}
            >
              <CellLabel title="SMALL" big="小" note="4–10｜1賠1\n三同視為輸" align="left" />
            </button>

            <div className="col-span-8 grid grid-cols-14 gap-2">
              {Array.from({length:14},(_,i)=>i+4).map(total=>(
                <button key={total}
                  className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                  disabled={!!state?.locked || placing || amount<=0}
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
              className={cx("sicbo-cell sicbo-cell--accent col-span-2", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("BIG")}
            >
              <CellLabel title="BIG" big="大" note="11–17｜1賠1\n三同視為輸" align="right" />
            </button>
          </div>

          {/* 單 / 雙 */}
          <div className="grid grid-cols-12 gap-2 mt-2">
            <button
              className={cx("sicbo-cell col-span-6", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("ODD")}
            >
              <div className="text-center">
                <div className="text-xl font-bold">單</div>
                <div className="text-[11px] opacity-80">1賠1（三同輸）</div>
              </div>
            </button>
            <button
              className={cx("sicbo-cell col-span-6", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
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
                  className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                  disabled={!!state?.locked || placing || amount<=0}
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
              className={cx("sicbo-cell sicbo-cell--triple col-span-2", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
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
                  className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                  disabled={!!state?.locked || placing || amount<=0}
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
                className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                disabled={!!state?.locked || placing || amount<=0}
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
                className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                disabled={!!state?.locked || placing || amount<=0}
                onClick={()=>place("SINGLE_DIE",{ eye:n })}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">{n}</div>
                  <div className="text-[11px] opacity-80">中1×2 / 2×3 / 3×4</div>
                </div>
              </button>
            ))}
          </div>

          {/* 籌碼列＋快捷鍵 */}
          <div className="toolbar">
            <div className="chips">
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
              <button className="btn btn--ghost" onClick={()=>setAmount(chip)}>用此籌碼額</button>
              <button className="btn btn--ghost" onClick={()=>setAmount(v=>Math.max(1, v*2))}>x2</button>
              <button className="btn btn--ghost" onClick={()=>setAmount(v=>Math.max(1, Math.floor(v/2)))}>½</button>
            </div>
            {state?.locked && <div className="locked-hint">已封盤，請等待下一局</div>}
          </div>

        </div>
      </div>
    </>
  );
}

/* ============ 小元件們 ============ */
function Dice({ n, rolling, size = "md" }: { n?: number; rolling?: boolean; size?: "sm"|"md"|"lg" }) {
  const faceCls = n ? `face-${n}` : "";
  const sizeCls = size === "sm" ? "dice-sm" : size === "lg" ? "dice-lg" : "";
  const rollingCls = rolling ? "rolling" : "";
  return (
    <span className={cx("dice", faceCls, sizeCls, rollingCls)}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
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
    <div className="infocard glass">
      <div className="k">{title}</div>
      <div className="v">{value}</div>
    </div>
  );
}
