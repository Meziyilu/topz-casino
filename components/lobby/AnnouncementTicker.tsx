"use client";

import { useEffect, useMemo, useState } from "react";
import "/public/styles/marquee.css";

type Msg = { id: string; text: string; priority?: number };
type Props = {
  items?: string[];        // 可選：自訂顯示
  intervalMs?: number;     // 預設 15000
};

export default function AnnouncementTicker({ items, intervalMs = 15000 }: Props) {
  const [remote, setRemote] = useState<Msg[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/marquee/active", { cache: "no-store" });
      const json = await res.json();
      setRemote((json.items || []) as Msg[]);
    } catch {}
  }

  useEffect(() => {
    if (!items || items.length === 0) {
      load();
      const t = setInterval(load, intervalMs);
      return () => clearInterval(t);
    }
  }, [items, intervalMs]);

  const showList: string[] = useMemo(() => {
    if (items && items.length) return items;
    if (remote.length) return remote.map((m) => m.text);
    return [];
  }, [items, remote]);

  if (!showList.length) return null;

  const dupe = [...showList, ...showList];

  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {dupe.map((txt, i) => (
          <span key={`${i}-${txt}`} className="marquee-item">
            {txt}
          </span>
        ))}
      </div>
    </div>
  );
}
