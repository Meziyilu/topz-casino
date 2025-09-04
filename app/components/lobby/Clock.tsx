// components/lobby/Clock.tsx
"use client";
import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState<string>(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      fontVariantNumeric: 'tabular-nums',
      opacity: .9,
      padding: '4px 10px',
      borderRadius: 8,
      background: 'rgba(255,255,255,.06)',
      border: '1px solid rgba(255,255,255,.12)'
    }}>
      {now}
    </div>
  );
}
