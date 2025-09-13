"use client";

import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 伺服器型別 */
type Phase = "BETTING" | "REVEALING" | "ANIMATING" | "SETTLED";
type Room = "SB_R30" | "SB_R60" | "SB_R90";
type StateApi = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; endedAt?: string; dice: number[] };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
};
type HistoryApi = {
  room: Room;
  items: { id: string; dice: number[]; endedAt: string }[];
};

const ROOM_LIST: Room[] = ["SB_R30", "SB_R60", "SB_R90"];
const ROOM_LABEL: Record<Room, string> = { SB_R30: "R30", SB_R60: "R60", SB_R90: "R90" };

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
const fmt = (sec?: number) => {
  const v = Math.max(0, Math.floor(sec ?? 0));
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/** 骰子視覺 */
function Dice({ n, rolling }: { n?: number; rolling?: boolean }) {
  const faceCls = n ? `face-${n}` : "face-1";
  return (
    <span className={cx("dice", rolling && "rolling", faceCls)}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
  );
}

/** 單一房卡 */
function RoomCard({ room }: { room: Room }) {
  const router = useRouter();
  const [state, setState] = useState<StateApi | null>(null);
  const [last, setLast] = useState<number[] | null>(null);

  // 平滑倒數：用 expireTime 計算
  const lockExpireRef = useRef<number>(0);
  const [lockLeft, setLockLeft] = useState(0);

  const sum = useMemo(() => {
    const d = last || [];
    return (d[0] || 0) + (d[1] || 0) + (d[2] || 0);
  }, [last]);

  async function load() {
    // state
    const rs = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    if (rs.ok) {
      const s: StateApi = await rs.json();
      setState(s);
      lockExpireRef.current = Date.now() + (s?.timers?.lockInSec ?? 0) * 1000;
    }
    // history (1筆)
    const rh = await fetch(`/api/casino/sicbo/history?room=${room}&limit=1`, { cache: "no-store" });
    if (rh.ok) {
      const h: HistoryApi = await rh.json();
      setLast(h?.items?.[0]?.dice ?? null);
    }
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 4000);
    return () => clearInterval(poll);
  }, [room]);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setLockLeft(Math.max(0, Math.ceil((lockExpireRef.current - now) / 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const rolling = state?.round?.phase === "REVEALING" || state?.round?.phase === "ANIMATING";

  return (
    <div className="room-card glass">
      <div className="card-head">
        <div className="room-name">{ROOM_LABEL[room]}</div>
        <button className="btn" onClick={() => router.push(`/casino/sicbo/rooms/${room}`)}>
          Enter
        </button>
      </div>

      <div className="meta-line">
        <span>Round <b>{state?.round?.id?.slice(-6) ?? "-"}</b></span>
        <span>Phase <b>{state?.round?.phase ?? "-"}</b></span>
        <span>Lock in <b className="countdown">{fmt(lockLeft)}</b></span>
      </div>

      <div className="meta-line">
        <span className="dim">Last:</span>
        <div className="dice-strip">
          {rolling ? (
            <>
              <Dice rolling /><Dice rolling /><Dice rolling />
            </>
          ) : last ? (
            <>
              <Dice n={last[0]} /><Dice n={last[1]} /><Dice n={last[2]} />
            </>
          ) : (
            <>N/A</>
          )}
        </div>
        {last && <span className="dim"> (Sum <b>{sum}</b>)</span>}
      </div>

      <div className="card-foot">
        <span className="tag">Sic Bo</span>
        <span className="dim">Room • {ROOM_LABEL[room]}</span>
      </div>
    </div>
  );
}

/** 大廳 */
export default function SicboLobby() {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/sicbo-lobby.css" />
      </Head>

      <div className="lobby-bg">
        <main className="lobby-wrap">
          <h1 className="lobby-title">Sic Bo Lobby</h1>
          <section className="room-grid">
            {ROOM_LIST.map((r) => <RoomCard key={r} room={r} />)}
          </section>
        </main>
      </div>
    </>
  );
}
