"use client";

import { useEffect, useState } from "react";
import "/public/styles/marquee.css";

type Msg = { id: string; text: string; priority: number };

export default function AnnouncementTicker() {
  const [items, setItems] = useState<Msg[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/marquee/active", { cache: "no-store" });
      const json = await res.json();
      setItems(json.items || []);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // 每 15 秒更新
    return () => clearInterval(t);
  }, []);

  if (!items.length) return null;

  // 將訊息串接兩輪，達成無縫滾動（CSS 動畫）
  const dupe = [...items, ...items];

  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {dupe.map((m, i) => (
          <span key={`${m.id}-${i}`} className="marquee-item">
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
