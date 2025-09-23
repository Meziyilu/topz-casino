// components/lobby/AnnouncementTicker.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type ActiveItem = { id: string; text: string };

export default function AnnouncementTicker({
  speed = 80,  // px/sec
  gap = 48,    // 每則訊息間距
  fallback = ["🎉 歡迎來到 TOPZ CASINO"],
}: {
  speed?: number;
  gap?: number;
  fallback?: string[];
}) {
  const [items, setItems] = useState<string[]>([]);
  const railRef = useRef<HTMLDivElement>(null);

  // 抓 /api/marquee/active
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/marquee/active", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        const texts = (d.items as ActiveItem[] | undefined)?.map((m) => m.text).filter(Boolean) ?? [];
        if (alive) setItems(texts.length ? texts : fallback);
      } catch {
        if (alive) setItems(fallback);
      }
    };
    load();
    // 可選：每 5 分鐘刷新一次
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, [fallback]);

  // 無限滾動
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !items.length) return;
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
  }, [items, speed]);

  if (!items.length) return null;

  return (
    <div
      className="tc-wrap"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        minHeight: 28,           // 保底高度避免被擠扁
        display: "flex",
        alignItems: "center",
      }}
      aria-label="跑馬燈"
    >
      <div
        ref={railRef}
        className="tc-rail"
        style={{ display: "inline-flex", whiteSpace: "nowrap", willChange: "transform" }}
      >
        {[0, 1].map((k) => (
          <div key={k} className="tc-chunk" style={{ display: "inline-flex" }}>
            {items.map((t, i) => (
              <span
                key={`${k}-${i}`}
                style={{ display: "inline-flex", alignItems: "center", paddingRight: gap, fontWeight: 700 }}
              >
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
