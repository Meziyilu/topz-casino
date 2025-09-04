"use client";
import { useEffect, useRef, useState } from "react";

export default function AnnouncementTicker({ items }: { items: string[] }) {
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(()=>{
    timer.current = window.setInterval(()=> setI(v => (v+1)%items.length), 3000);
    return ()=> { if (timer.current) clearInterval(timer.current); };
  },[items.length]);
  return (
    <div style={{
      minWidth: 0, maxWidth: 720,
      border: "1px solid rgba(255,255,255,.14)",
      borderRadius: 999, padding: "6px 12px",
      background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))",
      color: "#eaf6ff", overflow: "hidden", whiteSpace: "nowrap"
    }}>
      {items[i]}
    </div>
  );
}
