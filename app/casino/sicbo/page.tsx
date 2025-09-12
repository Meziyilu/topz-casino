"use client";

import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 伺服端 SICBO 狀態 API 回傳型別（與你的 /api/casino/sicbo/state 對齊） */
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type SicboRoomCode = "SB_R30" | "SB_R60" | "SB_R90";

type StateApi = {
  room: SicboRoomCode;
  round: { id: string; phase: Phase; startedAt: string; endedAt?: string; dice: number[] };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
};

type HistoryApi = {
  room: SicboRoomCode;
  items: { id: string; dice: number[]; endedAt: string }[];
};

type RoomKey = "R30" | "R60" | "R90";

const ROOM_MAP: Record<RoomKey, SicboRoomCode> = {
  R30: "SB_R30",
  R60: "SB_R60",
  R90: "SB_R90",
};

/** 小工具 */
function cx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }
function fmtSec(s: number) {
  const v = Math.max(0, Math.floor(s));
  const m = Math.floor(v / 60);
  const r = v % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Dice 元件（沿用房內骰子樣式） */
function Dice({ n, rolling = false, size = "md" }: { n?: number; rolling?: boolean; size?: "sm" | "md" | "lg" }) {
  const faceCls = n ? `face-${n}` : "";
  const sizeCls = size === "sm" ? "dice-sm" : size === "lg" ? "dice-lg" : "";
  const rollCls = rolling ? "rolling" : "";
  return (
    <span className={cx("dice", faceCls, sizeCls, rollCls)}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
  );
}

/** 每個房卡片內部 State（平滑倒數 + 近一局） */
function useRoomState(roomKey: RoomKey) {
  const code = ROOM_MAP[roomKey];
  const [state, setState] = useState<StateApi | null>(null);
  const [history, setHistory] = useState<HistoryApi | null>(null);

  // 平滑倒數（用 expiresAt 計算）
  const [lockLeft, setLockLeft] = useState(0);
  const [endLeft, setEndLeft] = useState(0);
  const lockExpireAtRef = useRef<number>(0);
  const endExpireAtRef = useRef<number>(0);
  const tickRef = useRef<number>();

  async function load() {
    const rs = await fetch(`/api/casino/sicbo/state?room=${code}`, { cache: "no-store" });
    if (rs.ok) {
      const s: StateApi = await rs.json();
      setState(s);

      // 以伺服端秒數建立「絕對截止」時間 → 客戶端本地每秒平滑扣
      lockExpireAtRef.current = Date.now() + (s?.timers?.lockInSec ?? 0) * 1000;
      endExpireAtRef.current  = Date.now() + (s?.timers?.endInSec ?? 0) * 1000;
      setLockLeft(s?.timers?.lockInSec ?? 0);
      setEndLeft(s?.timers?.endInSec ?? 0);
    }

    const rh = await fetch(`/api/casino/sicbo/history?room=${code}&limit=1`, { cache: "no-store" });
    if (rh.ok) {
      const h: HistoryApi = await rh.json();
      setHistory(h);
    }
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 5000); // 每 5 秒拉一次狀態，修正偏差
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey]);

  // 本地每秒 tick → 平滑顯示
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      setLockLeft(Math.max(0, Math.ceil((lockExpireAtRef.current - now) / 1000)));
      setEndLeft(Math.max(0, Math.ceil((endExpireAtRef.current - now) / 1000)));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  return {
    state, history,
    lockLeft, endLeft,
    reload: load,
  };
}

/** 個別房卡片 */
function RoomCard({ roomKey }: { roomKey: RoomKey }) {
  const router = useRouter();
  const { state, history, lockLeft, endLeft, reload } = useRoomState(roomKey);

  const roundIdShort = state?.round?.id?.slice(-6) ?? "-";
  const phase = state?.round?.phase ?? "BETTING";
  const rolling = phase === "REVEALING" && (!state?.round?.dice?.[0] || !state?.round?.dice?.[1] || !state?.round?.dice?.[2]);

  const lastDice = history?.items?.[0]?.dice ?? [];
  const lastSum = (lastDice[0] || 0) + (lastDice[1] || 0) + (lastDice[2] || 0);
  const lastTriple = lastDice.length === 3 && lastDice[0] === lastDice[1] && lastDice[1] === lastDice[2];

  return (
    <div className="room-card">
      <div className="room-head">
        <div className="name">{roomKey}</div>
        <div className="room-actions">
          <button className="btn" onClick={reload}>Refresh</button>
          <button
            className="btn btn-primary"
            onClick={() => router.push(`/casino/sicbo/rooms/${ROOM_MAP[roomKey]}`)}
          >
            Enter
          </button>
        </div>
      </div>

      <div className="room-stats">
        <div>Round <b>{roundIdShort}</b></div>
        <div>Phase <b>{phase}</b></div>
        <div className="countdown">Lock <b>{fmtSec(lockLeft)}</b></div>
        <div className="countdown">End <b>{fmtSec(endLeft)}</b></div>
      </div>

      <div className="room-last">
        <span className="label">Last:</span>
        {lastDice.length === 3 ? (
          <>
            <span className="dice-row">
              <Dice n={lastDice[0]} size="sm" />
              <Dice n={lastDice[1]} size="sm" />
              <Dice n={lastDice[2]} size="sm" />
            </span>
            <span>
              (Sum <b>{lastSum}</b>{lastTriple ? ", Triple" : ""})
            </span>
          </>
        ) : <span>N/A</span>}
      </div>

      {rolling && (
        <div className="room-hint">Rolling… 等待開獎</div>
      )}
    </div>
  );
}

/** 大廳頁面 */
export default function SicboLobbyPage() {
  return (
    <>
      {/* 共用骰子/深色/下注桌樣式 */}
      <Head>
        <link rel="stylesheet" href="/styles/sicbo.css" />
        <link rel="stylesheet" href="/styles/sicbo-lobby.css" />
      </Head>

      <main className="lobby-wrap">
        <header className="lobby-head">
          <div className="title">Sic Bo Lobby</div>
          <div className="sub">選擇一個房間進入下注</div>
        </header>

        {/* 如果你要在大廳上方也放「路子圖」，可以在這裡插入你的 Roadmap 元件 */}
        {/* <section className="lobby-road glass">...Roadmap...</section> */}
        <div className="lobby-section-gap"></div>

        <section className="lobby-grid">
          <RoomCard roomKey="R30" />
          <RoomCard roomKey="R60" />
          <RoomCard roomKey="R90" />
        </section>
      </main>
    </>
  );
}
