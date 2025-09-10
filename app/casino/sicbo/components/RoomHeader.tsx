"use client";

import Link from "next/link";

type Room = "R30" | "R60" | "R90";

export default function RoomHeader({
  room,
  daySeq,
  phase,
  countdown,
  balance,
}: {
  room: Room;
  daySeq: number;
  phase: string;
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
        鐏炩偓閾?<b>{daySeq}</b>閿濇粎濯幈?<b>{phase}</b>閿濇粌鈧帗鏆?<b>{countdown}s</b>
      </div>
      <div className="text-sm">妞佹﹢顢?<b>{balance.toLocaleString()}</b></div>
    </div>
  );
}
