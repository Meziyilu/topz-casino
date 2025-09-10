"use client";

import { useEffect, useState } from "react";
import { useSSE } from "../../../../lib/useSSE";
import RoomHeader from "../components/RoomHeader";
import DiceAnimation from "../components/DiceAnimation";
import SicboBoard from "../components/SicboBoard";
import RoadmapPanel from "../components/RoadmapPanel";
import "../../../../styles/sicbo.css";

type StateResp = {
  room: "R60";
  current: { daySeq: number; phase: string; locksAt: string };
  config: { payoutTable: any };
  history: { daySeq: number; die1: number; die2: number; die3: number; sum: number; isTriple: boolean }[];
  my?: { balance: number };
};

export default function Page() {
  const room = "R60";
  const [s, setS] = useState<StateResp | null>(null);
  const [winKeys, setWinKeys] = useState<Set<string>>(new Set());
  const [dice, setDice] = useState<[number, number, number] | null>(null);
  const [countdown, setCountdown] = useState(0);

  async function load() {
    const r = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    const j = await r.json();
    setS(j);
  }

  useEffect(() => { load(); }, []);

  useSSE(`/api/casino/sicbo/stream?room=${room}`, (ev: any) => {
    if (ev.type === "state") {
      const d = JSON.parse(ev.data);
      setCountdown(Math.max(0, Math.floor((new Date(d.state.locksAt).getTime() - Date.now()) / 1000)));
    }
    if (ev.type === "result") {
      const { dice, sum, isTriple } = JSON.parse(ev.data);
      setDice(dice);

      const wins = new Set<string>();
      if (!isTriple) {
        if (sum >= 11) wins.add("BIG");
        if (sum <= 10) wins.add("SMALL");
      }
      wins.add(`TOTAL_${sum}`);
      [1, 2, 3, 4, 5, 6].forEach((f) => {
        const c = dice.filter((x: number) => x === f).length;
        if (c > 0) wins.add(`FACE_${f}`);
        if (c >= 2) wins.add(`DBL_${f}`);
      });
      if (isTriple) {
        wins.add("TRIPLE_ANY");
        wins.add(`TRIPLE_${dice[0]}${dice[0]}${dice[0]}`);
      }
      setWinKeys(wins);
      setTimeout(() => setWinKeys(new Set()), 2500);
      load();
    }
  });

  const onBet = async (b: any) => {
    await fetch(`/api/casino/sicbo/bet`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, bets: [b] }),
    });
    await load();
  };

  if (!s) return <div className="p-6">載入中…</div>;

  return (
    <div className="p-4 space-y-4">
      <RoomHeader room="R60" daySeq={s.current.daySeq} phase={s.current.phase} countdown={countdown} balance={s.my?.balance ?? 0} />
      <DiceAnimation dice={dice} />
      <SicboBoard payoutTable={s.config.payoutTable} disabled={s.current.phase !== "BETTING"} onBet={onBet} winKeys={winKeys} />
      <RoadmapPanel history={s.history} />
    </div>
  );
}
