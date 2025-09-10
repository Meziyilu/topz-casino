"use client";

import Link from "next/link";

type Room = "R30" | "R60" | "R90";
type Phase = "BETTING" | "LOCKED" | "SETTLED";

export default function RoomHeader({
  room,
  daySeq,
  phase,
  countdown,
  balance,
}: {
  room: Room;
  daySeq: number;
  phase: Phase | string;
  countdown: number;
  balance: number;
}) {
  const Tab = ({ code }: { code: Room }) => (
    <Link
      href={`/casino/sicbo/${code.toLowerCase()}`}
      className={`px-3 py-1 rounded transition ${
        room === code ? "bg-white/20" : "hover:bg-white/10"
      }`}
    >
      {code}
    </Link>
  );

  return (
    <div className="glass p-4 rounded-lg flex items-center justify-between">
      <div className="flex gap-2">
        <Tab code="R30" />
        <Tab code="R60" />
        <Tab code="R90" />
      </div>

      <div className="text-sm opacity-90">
        局號 <b>{daySeq}</b>｜狀態 <b>{phase}</b>｜倒數 <b>{countdown}s</b>
      </div>

      <div className="text-sm">
        餘額 <b>{Number(balance ?? 0).toLocaleString()}</b>
      </div>
    </div>
  );
}
