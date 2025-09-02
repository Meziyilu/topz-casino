"use client";
import { useEffect, useState } from "react";

type Props = { drawAtISO: string; serverTimeISO: string; onTick?: (secLeft: number) => void; };

export default function Countdown({ drawAtISO, serverTimeISO, onTick }: Props) {
  const [sec, setSec] = useState<number>(() => {
    const server = new Date(serverTimeISO).getTime();
    const draw = new Date(drawAtISO).getTime();
    return Math.max(0, Math.floor((draw - server) / 1000));
  });
  useEffect(() => {
    const int = setInterval(() => {
      setSec((s) => { const n = Math.max(0, s - 1); onTick?.(n); return n; });
    }, 1000);
    return () => clearInterval(int);
  }, [onTick]);
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-widest text-white/60">距離開獎</div>
      <div className="text-4xl font-extrabold">{sec}s</div>
    </div>
  );
}
