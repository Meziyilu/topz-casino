// components/lobby/AnnouncementTicker.tsx
"use client";

import { useEffect, useRef, useState } from "react";
type ActiveItem = { id: string; text: string };

export default function AnnouncementTicker({
  items,                 // <- 變成可選
  speed = 80,
  gap = 48,
  fallback = ["🎉 歡迎來到 TOPZ CASINO"],
}: {
  items?: string[];      // <- 可選
  speed?: number;
  gap?: number;
  fallback?: string[];
}) {
  const [autoItems, setAutoItems] = useState<string[]>([]);
  const data = items && items.length ? items : autoItems; // 優先使用外部 items
  const railRef = useRef<HTMLDivElement>(null);

  // 只有在「沒有外部 items」時才打 API
  useEffect(() => {
    if (items && items.length) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/marquee/active", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        const texts = (d.items as ActiveItem[] | undefined)?.map((m) => m.text).filter(Boolean) ?? [];
        if (alive) setAutoItems(texts.length ? texts : fallback);
      } catch {
        if (alive) setAutoItems(fallback);
      }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, [items, fallback]);

  // 無限滾動
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !data.length) return;
    let raf = 0;
    let x = 0;
    const tick = () => {
      x -= speed / 60;
      const first = rail.firstElementChild as HTMLElement | null;
      const w = first ? first.offsetWidth : 0;
      if (w > 0 && -x >= w) x += w;
      rail.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, speed]);

  if (!data.length) return null;

  return (
    <div
      className="tc-wrap"
      style={{ position: "relative", overflow: "hidden", width: "100%", minHeight: 28, display: "flex", alignItems: "center" }}
      aria-label="跑馬燈"
    >
      <div ref={railRef} className="tc-rail" style={{ display: "inline-flex", whiteSpace: "nowrap", willChange: "transform" }}>
        {[0, 1].map((k) => (
          <div key={k} className="tc-chunk" style={{ display: "inline-flex" }}>
            {data.map((t, i) => (
              <span key={`${k}-${i}`} style={{ display: "inline-flex", alignItems: "center", paddingRight: gap, fontWeight: 700 }}>
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
