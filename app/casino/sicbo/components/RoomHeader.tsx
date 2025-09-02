"use client";
import Link from "next/link";

export default function RoomHeader({room, daySeq, phase, countdown, balance}:{room:"R30"|"R60"|"R90"; daySeq:number; phase:"BETTING"|"LOCKED"|"SETTLED"; countdown:number; balance:number;}){
  return (
    <div className="glass p-4 mb-4 flex items-center justify-between">
      <div className="flex gap-2">
        <Link href="/casino/sicbo/r30" className={`px-3 py-1 rounded ${room==="R30"?"bg-white/20":""}`}>R30</Link>
        <Link href="/casino/sicbo/r60" className={`px-3 py-1 rounded ${room==="R60"?"bg-white/20":""}`}>R60</Link>
        <Link href="/casino/sicbo/r90" className={`px-3 py-1 rounded ${room==="R90"?"bg-white/20":""}`}>R90</Link>
      </div>
      <div className="text-sm opacity-90">局號 <b>{daySeq}</b>｜狀態 <b>{phase}</b>｜倒數 <b>{countdown}s</b></div>
      <div>餘額 <b>{balance.toLocaleString()}</b></div>
    </div>
  );
}
