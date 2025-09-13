"use client";

import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
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
  timers: { lockInSec: number; endInSec: number; revealWindowSec?: number };
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
  const s = Math.max(0, Math.floor(sec ?? 0));
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function SicboRoomPage() {
  const params = useParams<{ room: Room }>();
  const router = useRouter();

  const [room, setRoom] = useState<Room>("SB_R30");
  const [state, setState] = useState<StateResp | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  const [chip, setChip] = useState<number>(100);
  const [amount, setAmount] = useState<number>(100);
  const [placing, setPlacing] = useState(false);

  const [history, setHistory] = useState<{ id: string; dice: number[]; endedAt: string }[]>([]);

  // 本地平滑倒數（避免「跳」）
  const [lockLeft, setLockLeft] = useState(0);
  const [endLeft, setEndLeft] = useState(0);
  const tickRef = useRef<number | null>(null);

  // 解析路由房間
  useEffect(() => {
    const r = (params?.room?.toString()?.toUpperCase() as Room) || "SB_R30";
    setRoom(["SB_R30","SB_R60","SB_R90"].includes(r) ? r : "SB_R30");
  }, [params?.room]);

  // 取當前登入使用者（改用 /api/users/me）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (!res.ok) return; // 未登入時不要擋住畫面
        const j = await res.json();
        if (j?.ok && j.user?.id) {
          setUserId(j.user.id);
          setBalance(j.user.balance ?? 0);
        }
      } catch {}
    })();
  }, []);

  // API：狀態
  async function fetchState() {
    const res = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    if (res.ok) {
      const j: StateResp = await res.json();
      setState(j);
      // 重置本地倒數
      setLockLeft(j?.timers?.lockInSec ?? 0);
      setEndLeft(j?.timers?.endInSec ?? 0);
    }
  }
  // API：餘額
  async function fetchBalance() {
    if (!userId) return;
    const res = await fetch(`/api/wallet/balance?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
    if (res.ok) setBalance((await res.json()).balance ?? 0);
  }
  // API：路子
  async function fetchHistory() {
    const res = await fetch(`/api/casino/sicbo/history?room=${room}&limit=12`, { cache: "no-store" });
    if (res.ok) {
      const js = await res.json();
      setHistory(js.items ?? []);
    }
  }

  // 初次與輪詢
  useEffect(() => { fetchState(); fetchBalance(); fetchHistory(); }, [room, userId]);
  useEffect(() => {
    const t1 = setInterval(fetchState, 2000);
    const t2 = setInterval(fetchBalance, 5000);
    const t3 = setInterval(fetchHistory, 8000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [room, userId]);

  // 平滑倒數：每秒 -1
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setLockLeft(v => Math.max(0, v - 1));
      setEndLeft(v => Math.max(0, v - 1));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  useEffect(() => setAmount(chip), [chip]);

  // 下單：改成由 cookie 帶入 userId（後端從 req 取）
  async function place(kind: Kind, payload?: any) {
    if (!state || state.locked || placing || amount <= 0) return;
    setPlacing(true);
    try {
      const res = await fetch(`/api/casino/sicbo/bet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, kind, amount, payload }), // 不再傳 userId
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

  const pairs = useMemo<[number, number][]>(() => {
    const o: [number, number][] = [];
    for (let a = 1; a <= 6; a++) for (let b = a + 1; b <= 6; b++) o.push([a, b]);
    return o;
  }, []);

  return (
    <>
      <Head><link rel="stylesheet" href="/styles/sicbo.css" /></Head>

      <div className="sicbo-wrapper">
        {/* 頂部工具列 */}
        <div className="topbar glass">
          <div className="left">
            <button className="btn btn--ghost" onClick={() => router.push("/casino/sicbo")}>← 返回大廳</button>
            <div className="room-pill">{room.replace("SB_", "")}</div>
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
                onChange={(e)=>setAmount(Math.max(1, Number(e.target.value||0)))}
              />
            </div>
          </div>
        </div>

        {/* 綠色賭桌 */}
        <div className="table-outer glass">
          {/* Info row + 開獎卡片 */}
          <div className="table-head">
            <div className="head-item"><div className="k">局號</div><div className="v">{state?.round?.id?.slice(-6) ?? "-"}</div></div>
            <div className="head-item"><div className="k">狀態</div><div className="v">{state?.round?.phase ?? "-"}</div></div>
            <div className="head-item"><div className="k">封盤</div><div className="v">{fmt(lockLeft)}</div></div>
            <div className="head-item"><div className="k">結束</div><div className="v">{fmt(endLeft)}</div></div>

            <RevealCard
              phase={state?.round?.phase}
              dice={state?.round?.dice ?? []}
              rolling={!!(state && (state.round.phase === "REVEALING" || (lockLeft === 0 && endLeft > 0 && (state.round.dice?.length ?? 0) === 0)))}
            />
          </div>

          {/* =====下注面板（完整）===== */}
          <div className="table-grid">
            {/* 左：SMALL */}
            <button
              className={cx("tile big-left", (state?.locked||placing||amount<=0)&&"disabled")}
              disabled={!!state?.locked||placing||amount<=0}
              onClick={()=>place("SMALL")}
            >
              <div className="badge">SMALL</div><div className="cn">小</div><div className="note">4–10｜1賠1<br/>三同輸</div>
            </button>

            {/* 中：總和 */}
            <div className="mid-14">
              {Array.from({ length: 14 }, (_, i)=>i+4).map(total=>(
                <button key={total}
                  className={cx(
                    "sicbo-cell total",
                    (state?.locked||placing||amount<=0)&&"disabled",
                    winnerClassForTotal(state?.round?.dice, total)
                  )}
                  disabled={!!state?.locked||placing||amount<=0}
                  onClick={()=>place("TOTAL",{ total })}
                >
                  <div className="total-num">{total}</div>
                  <div className="total-odd">1賠{TOTAL_PAYOUT[total]}</div>
                </button>
              ))}
            </div>

            {/* 右：BIG */}
            <button
              className={cx(
                "tile big-right",
                (state?.locked||placing||amount<=0)&&"disabled",
                winnerClassForBigSmall(state?.round?.dice, "BIG")
              )}
              disabled={!!state?.locked||placing||amount<=0}
              onClick={()=>place("BIG")}
            >
              <div className="badge">BIG</div><div className="cn">大</div><div className="note">11–17｜1賠1<br/>三同輸</div>
            </button>
          </div>

          {/* 單雙 */}
          <div className="row-two">
            <button
              className={cx(
                "sicbo-cell",
                (state?.locked||placing||amount<=0)&&"disabled",
                winnerClassForOddEven(state?.round?.dice, "ODD")
              )}
              disabled={!!state?.locked||placing||amount<=0}
              onClick={()=>place("ODD")}
            >
              <div className="h1">單</div><div className="sub">1賠1（三同輸）</div>
            </button>
            <button
              className={cx(
                "sicbo-cell",
                (state?.locked||placing||amount<=0)&&"disabled",
                winnerClassForOddEven(state?.round?.dice, "EVEN")
              )}
              disabled={!!state?.locked||placing||amount<=0}
              onClick={()=>place("EVEN")}
            >
              <div className="h1">雙</div><div className="sub">1賠1（三同輸）</div>
            </button>
          </div>

          {/* 雙 / 豹子 */}
          <div className="row-multi">
            <div className="doubles">
              {Array.from({ length: 6 }, (_,i)=>i+1).map(n=>(
                <button
                  key={`d${n}`}
                  className={cx(
                    "sicbo-cell",
                    (state?.locked||placing||amount<=0)&&"disabled",
                    winnerClassForSpecificDouble(state?.round?.dice, n)
                  )}
                  disabled={!!state?.locked||placing||amount<=0}
                  onClick={()=>place("SPECIFIC_DOUBLE",{eye:n})}
                >
                  <div className="h2">雙 {n}{n}</div><div className="sub">1賠8</div>
                </button>
              ))}
            </div>
            <button
              className={cx(
                "sicbo-cell any-triple",
                (state?.locked||placing||amount<=0)&&"disabled",
                winnerClassForAnyTriple(state?.round?.dice)
              )}
              disabled={!!state?.locked||placing||amount<=0}
              onClick={()=>place("ANY_TRIPLE")}
            >
              <div className="h2">任意豹子</div><div className="sub">1賠30</div>
            </button>
            <div className="triples">
              {Array.from({ length: 6 }, (_,i)=>i+1).map(n=>(
                <button
                  key={`t${n}`}
                  className={cx(
                    "sicbo-cell",
                    (state?.locked||placing||amount<=0)&&"disabled",
                    winnerClassForSpecificTriple(state?.round?.dice, n)
                  )}
                  disabled={!!state?.locked||placing||amount<=0}
                  onClick={()=>place("SPECIFIC_TRIPLE",{eye:n})}
                >
                  <div className="h2">豹子 {n}{n}{n}</div><div className="sub">1賠150</div>
                </button>
              ))}
            </div>
          </div>

          {/* 組合 */}
          <div className="combos">
            {pairs.map(([a,b])=>(
              <button
                key={`p${a}${b}`}
                className={cx(
                  "sicbo-cell",
                  (state?.locked||placing||amount<=0)&&"disabled",
                  winnerClassForCombination(state?.round?.dice, a, b)
                )}
                disabled={!!state?.locked||placing||amount<=0}
                onClick={()=>place("COMBINATION",{a,b})}
              >
                <div className="h2">{a}+{b}</div><div className="sub">1賠5</div>
              </button>
            ))}
          </div>

          {/* 單骰 */}
          <div className="singles">
            {Array.from({ length: 6 }, (_,i)=>i+1).map(n=>(
              <button
                key={`s${n}`}
                className={cx(
                  "sicbo-cell",
                  (state?.locked||placing||amount<=0)&&"disabled",
                  winnerClassForSingle(state?.round?.dice, n)
                )}
                disabled={!!state?.locked||placing||amount<=0}
                onClick={()=>place("SINGLE_DIE",{eye:n})}
              >
                <div className="h2">{n}</div><div className="sub">中1×2 / 2×3 / 3×4</div>
              </button>
            ))}
          </div>

          {/* 工具條 */}
          <div className="toolbar">
            <div className="chips">
              <span className="chips-label">籌碼</span>
              {CHIP_PRESETS.map(v=>(
                <button
                  key={v}
                  onClick={()=>{setChip(v);setAmount(v);}}
                  className={cx("chip",`chip-${v}`,chip===v&&"selected")}
                  title={`${v}`}
                >{v}</button>
              ))}
              <button className="btn btn--ghost" onClick={()=>setAmount(chip)}>用此籌碼額</button>
              <button className="btn btn--ghost" onClick={()=>setAmount(v=>Math.max(1,v*2))}>x2</button>
              <button className="btn btn--ghost" onClick={()=>setAmount(v=>Math.max(1,Math.floor(v/2)))}>½</button>
            </div>
            {state?.locked && <div className="locked-hint">已封盤，請等待下一局</div>}
          </div>
        </div>

        {/* 路子圖 */}
        <Roadmap history={history} />
      </div>
    </>
  );
}

/** 開獎動畫卡片 */
function RevealCard({ phase, dice, rolling }: { phase?: Phase; dice: number[]; rolling: boolean }) {
  const hasDice = (dice?.length ?? 0) === 3;
  // 有結果時，給「彈出」動畫；揭曉中時給「滾動」動畫
  const klass =
    hasDice ? "reveal-dice popped" :
    rolling ? "reveal-dice rolling" :
    "reveal-dice";
  return (
    <div className="reveal-card">
      <div className="reveal-title">{phase==="REVEALING" ? "開獎中" : "結果"}</div>
      <div className={klass}>
        <Dice n={dice?.[0]} rolling={rolling&&!hasDice} size="lg" />
        <Dice n={dice?.[1]} rolling={rolling&&!hasDice} size="lg" />
        <Dice n={dice?.[2]} rolling={rolling&&!hasDice} size="lg" />
      </div>
    </div>
  );
}

/** 骰子 */
function Dice({ n, rolling, size="md" }: { n?: number; rolling?:boolean; size?: "sm"|"md"|"lg" }) {
  const faceCls = n ? `face-${n}`:""; const sizeCls = size==="sm"?"dice-sm":size==="lg"?"dice-lg":"";
  return (
    <span className={cx("dice",faceCls,rolling?"rolling":"",sizeCls)}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
  );
}

/** 路子圖 */
function Roadmap({ history }: { history: { id:string; dice:number[]; endedAt:string }[] }) {
  return (
    <div className="roadmap glass" aria-label="sicbo-roadmap">
      {(history??[]).map(h=>{
        const d=h.dice||[];
        const s=(d[0]||0)+(d[1]||0)+(d[2]||0);
        const tag=(d[0]===d[1]&&d[1]===d[2])?"豹子":(s>=11?"大":"小");
        return (
          <div key={h.id} className="roadmap-cell">
            <div className="dice-mini">
              <Dice n={d[0]} size="sm" /><Dice n={d[1]} size="sm" /><Dice n={d[2]} size="sm" />
            </div>
            <div className="meta">
              <span className="sum">{s||"-"}</span>
              <span className="tag">{tag}</span>
            </div>
          </div>
        );
      })}
      {(history?.length??0)===0 && <div className="roadmap-empty">暫無歷史</div>}
    </div>
  );
}

/* ======== 勝利格子判定（加上 .winner 會觸發金光 CSS） ======== */
function winnerClassForTotal(dice?: number[], total?: number) {
  if (!dice || dice.length !== 3 || total == null) return "";
  const s = dice[0]+dice[1]+dice[2];
  const triple = dice[0]===dice[1] && dice[1]===dice[2];
  return (!triple && s===total) ? "winner" : "";
}
function winnerClassForBigSmall(dice?: number[], which?: "BIG"|"SMALL") {
  if (!dice || dice.length!==3) return "";
  const s = dice[0]+dice[1]+dice[2];
  const triple = dice[0]===dice[1] && dice[1]===dice[2];
  if (triple) return "";
  if (which==="BIG" && s>=11) return "winner";
  if (which==="SMALL" && s<=10) return "winner";
  return "";
}
function winnerClassForOddEven(dice?: number[], which?: "ODD"|"EVEN") {
  if (!dice || dice.length!==3) return "";
  const s = dice[0]+dice[1]+dice[2];
  const triple = dice[0]===dice[1] && dice[1]===dice[2];
  if (triple) return "";
  if (which==="ODD" && s%2===1) return "winner";
  if (which==="EVEN" && s%2===0) return "winner";
  return "";
}
function winnerClassForAnyTriple(dice?: number[]) {
  if (!dice || dice.length!==3) return "";
  return (dice[0]===dice[1] && dice[1]===dice[2]) ? "winner" : "";
}
function winnerClassForSpecificTriple(dice?: number[], eye?: number) {
  if (!dice || dice.length!==3 || !eye) return "";
  return (dice[0]===eye && dice[1]===eye && dice[2]===eye) ? "winner" : "";
}
function winnerClassForSpecificDouble(dice?: number[], eye?: number) {
  if (!dice || dice.length!==3 || !eye) return "";
  const cnt = dice.filter(d=>d===eye).length;
  return (cnt>=2) ? "winner" : "";
}
function winnerClassForCombination(dice?: number[], a?: number, b?: number) {
  if (!dice || dice.length!==3 || !a || !b) return "";
  const hasA = dice.includes(a);
  // 如果有一顆是 a 之後，另一顆要 b（不能同一顆）
  if (!hasA) return "";
  const idx = dice.findIndex(x=>x===a);
  const rest = dice.filter((_,i)=>i!==idx);
  return rest.includes(b) ? "winner" : "";
}
function winnerClassForSingle(dice?: number[], eye?: number) {
  if (!dice || dice.length!==3 || !eye) return "";
  const cnt = dice.filter(d=>d===eye).length;
  return (cnt>=1) ? "winner" : "";
}
