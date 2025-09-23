"use client";

import { useEffect, useMemo, useState } from "react";
import "/public/styles/marquee.css";

type Msg = { id: string; text: string; priority?: number };
type Props = {
  /** 靜態文字（可選）；若提供則優先顯示這些 */
  items?: string[];
  /** 輪詢間隔（毫秒）；預設 15000 */
  intervalMs?: number;
};

export default function AnnouncementTicker({ items, intervalMs = 15000 }: Props) {
  const [remote, setRemote] = useState<Msg[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/marquee/active", { cache: "no-store" });
      const json = await res.json();
      setRemote((json.items || []) as Msg[]);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // 只有在沒有傳 props.items 時，才打 API
    if (!items || items.length === 0) {
      load();
      const t = setInterval(load, intervalMs);
      return () => clearInterval(t);
    }
  }, [items, intervalMs]);

  // 顯示優先順序：props.items -> API 取得
  const showList: string[] = useMemo(() => {
    if (items && items.length) return items;
    if (remote.length) return remote.map((m) => m.text);
    return [];
  }, [items, remote]);

  if (!showList.length) return null;

  // 無縫滾動：複製一份
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
