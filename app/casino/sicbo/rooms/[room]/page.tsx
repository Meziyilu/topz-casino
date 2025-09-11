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
  timers: { lockInSec: number; endInSec: number };
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

const CHIP_PRESETS = [10, 100, 1000, 5000] as const;

function cx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }
function fmt(sec?: number) {
  const s = Math.max(0, Math.floor(sec ?? 0)); const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function SicboRoomPage() {
  const params = useParams<{ room: Room }>();
  const router = useRouter();

  const [room, setRoom] = useState<Room>("SB_R30");
  const [state, setState] = useState<StateResp | null>(null);
  const [userId, setUserId] = useState("demo-user");       // 無驗證：輸入誰就扣誰
  const [balance, setBalance] = useState(0);
  const [chip, setChip] = useState<number>(100);
  const [amount, setAmount] = useState<number>(100);
  const [placing, setPlacing] = useState(false);

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
    if (res.ok) setBalance((await res.json()).balance ?? 0);
  }
  useEffect(() => { fetchState(); fetchBalance(); }, [room, userId]);
  useEffect(() => {
    const t1 = setInterval(fetchState, 3000);
    const t2 = setInterval(fetchBalance, 5000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [room, userId]);
  useEffect(() => setAmount(chip), [chip]);

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
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, roundId: state.round.id }),
    });
    const js = await res.json();
    if (!res.ok) return alert(js?.error || "返金失敗");
    alert(`已返金 ${js.refunded} 元`);
    fetchBalance(); fetchState();
  }

  async function topup(v: number) {
    const r = await fetch(`/api/wallet/topup`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, amount: v }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "topup 失敗");
    setBalance(j.balance);
  }

  const lockLeft = state?.timers?.lockInSec ?? 0;
  const endLeft  = state?.timers?.endInSec  ?? 0;

  const pairs = useMemo<[number, number][]>(() => {
    const o: [number, number][] = [];
    for (let a = 1; a <= 6; a++) for (let b = a + 1; b <= 6; b++) o.push([a, b]);
    return o;
  }, []);

  return (
    <>
      <Head><link rel="stylesheet" href="/styles/sicbo.css" /></Head>

      <div className="sicbo-wrapper">
        {/* 頂部工具列（玻璃） */}
        <div className="topbar glass">
          <div className="left">
            <button className="btn btn--ghost" onClick={() => router.push("/casino/sicbo")}>← 返回</button>
            <div className="room-pill">{room.replace("SB_", "")}</div>
          </div>

          <div className="right">
            <div className="wallet">
              <span className="label">餘額</span>
              <span className="val">${balance.toLocaleString()}</span>
              <button className="btn btn--ghost" onClick={() => topup(10000)}>+1w</button>
              <button className="btn btn--ghost" onClick={() => topup(100000)}>+10w</button>
            </div>
            <div className="amount">
              <span className="label">下注金額</span>
              <input type="number" min={1} value={amount} onChange={(e)=>setAmount(Math.max(1, Number(e.target.value||0)))} />
            </div>
            <input className="user-input" value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="userId" />
            <button className="btn btn--amber" onClick={refundThisRound} disabled={state?.locked}>返金本局</button>
          </div>
        </div>

        {/* 綠色賭桌（整塊容納下注區） */}
        <div className="table-outer glass">
          {/* 上方顯示列 */}
          <div className="table-head">
            <div className="head-item">
              <div className="k">局號</div><div className="v">{state?.round?.id?.slice(-6) ?? "-"}</div>
            </div>
            <div className="head-item">
              <div className="k">狀態</div><div className="v">{state?.round?.phase ?? "-"}</div>
            </div>
            <div className="head-item">
              <div className="k">封盤</div><div className="v">{fmt(lockLeft)}</div>
            </div>
            <div className="head-item">
              <div className="k">結束</div><div className="v">{fmt(endLeft)}</div>
            </div>
            <div className="head-dice">
              <Dice n={state?.round?.dice?.[0]} rolling={state?.round?.phase==="REVEALING" && !state?.round?.dice?.[0]} size="lg" />
              <Dice n={state?.round?.dice?.[1]} rolling={state?.round?.phase==="REVEALING" && !state?.round?.dice?.[1]} size="lg" />
              <Dice n={state?.round?.dice?.[2]} rolling={state?.round?.phase==="REVEALING" && !state?.round?.dice?.[2]} size="lg" />
            </div>
          </div>

          {/* 大型賭桌（左小/中總和/右大） */}
          <div className="table-grid">
            {/* SMALL 左柱 */}
            <button
              className={cx("tile big-left", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("SMALL")}
            >
              <div className="badge">SMALL</div>
              <div className="cn">小</div>
              <div className="note">4–10｜1賠1<br/>三同視為輸</div>
            </button>

            {/* 中央 4..17 14 格 */}
            <div className="mid-14">
              {Array.from({ length: 14 }, (_, i) => i + 4).map(total => (
                <button key={total}
                  className={cx("sicbo-cell total", (state?.locked || placing || amount<=0) && "disabled")}
                  disabled={!!state?.locked || placing || amount<=0}
                  onClick={()=>place("TOTAL", { total })}
                >
                  <div className="total-num">{total}</div>
                  <div className="total-odd">1賠{TOTAL_PAYOUT[total]}</div>
                </button>
              ))}
            </div>

            {/* BIG 右柱 */}
            <button
              className={cx("tile big-right", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("BIG")}
            >
              <div className="badge">BIG</div>
              <div className="cn">大</div>
              <div className="note">11–17｜1賠1<br/>三同視為輸</div>
            </button>
          </div>

          {/* 單／雙 列 */}
          <div className="row-two">
            <button
              className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("ODD")}
            >
              <div className="h1">單</div><div className="sub">1賠1（三同輸）</div>
            </button>
            <button
              className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("EVEN")}
            >
              <div className="h1">雙</div><div className="sub">1賠1（三同輸）</div>
            </button>
          </div>

          {/* 指定雙 + 任意豹子 + 指定豹子 */}
          <div className="row-multi">
            <div className="doubles">
              {Array.from({ length: 6 }, (_, i) => i + 1).map(n => (
                <button key={`d${n}`}
                        className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                        disabled={!!state?.locked || placing || amount<=0}
                        onClick={()=>place("SPECIFIC_DOUBLE",{ eye:n })}>
                  <div className="h2">雙 {n}{n}</div><div className="sub">1賠8</div>
                </button>
              ))}
            </div>

            <button
              className={cx("sicbo-cell any-triple", (state?.locked || placing || amount<=0) && "disabled")}
              disabled={!!state?.locked || placing || amount<=0}
              onClick={()=>place("ANY_TRIPLE")}
            >
              <div className="h2">任意豹子</div><div className="sub">1賠30</div>
            </button>

            <div className="triples">
              {Array.from({ length: 6 }, (_, i) => i + 1).map(n => (
                <button key={`t${n}`}
                        className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                        disabled={!!state?.locked || placing || amount<=0}
                        onClick={()=>place("SPECIFIC_TRIPLE",{ eye:n })}>
                  <div className="h2">豹子 {n}{n}{n}</div><div className="sub">1賠150</div>
                </button>
              ))}
            </div>
          </div>

          {/* 兩數組合 15 格 */}
          <div className="combos">
            {pairs.map(([a,b]) => (
              <button key={`p${a}${b}`}
                      className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                      disabled={!!state?.locked || placing || amount<=0}
                      onClick={()=>place("COMBINATION",{ a,b })}>
                <div className="h2">{a} + {b}</div><div className="sub">1賠5</div>
              </button>
            ))}
          </div>

          {/* 單骰 1..6 */}
          <div className="singles">
            {Array.from({ length: 6 }, (_, i) => i + 1).map(n => (
              <button key={`s${n}`}
                      className={cx("sicbo-cell", (state?.locked || placing || amount<=0) && "disabled")}
                      disabled={!!state?.locked || placing || amount<=0}
                      onClick={()=>place("SINGLE_DIE",{ eye:n })}>
                <div className="h2">{n}</div><div className="sub">中1×2 / 2×3 / 3×4</div>
              </button>
            ))}
          </div>

          {/* 底部工具條（籌碼＋快捷） */}
          <div className="toolbar">
            <div className="chips">
              <span className="chips-label">籌碼</span>
              {CHIP_PRESETS.map(v => (
                <button key={v}
                        onClick={()=>{setChip(v); setAmount(v);}}
                        className={cx("chip", `chip-${v}`, chip===v && "selected")}
                        title={`${v}`}>{v}</button>
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

function Dice({ n, rolling, size = "md" }: { n?: number; rolling?: boolean; size?: "sm"|"md"|"lg" }) {
  const faceCls = n ? `face-${n}` : ""; const sizeCls = size === "sm" ? "dice-sm" : size === "lg" ? "dice-lg" : "";
  return (
    <span className={cx("dice", faceCls, rolling ? "rolling" : "", sizeCls)}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
  );
}
