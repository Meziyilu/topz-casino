"use client";

import { useEffect, useMemo, useState } from "react";
import "/public/styles/announcements.css";

type Ann = { id: string; title: string; body: string; updatedAt: string };

export default function AnnouncementModal() {
  const [items, setItems] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const top = useMemo(() => items[0], [items]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/announcements/active", { cache: "no-store" });
        const json = await res.json();
        const list: Ann[] = json.items ?? [];
        setItems(list);

        // 用 localStorage 記錄最新公告是否看過（依更新時間）
        if (list.length) {
          const k = `ann_seen_${list[0].id}_${new Date(list[0].updatedAt).getTime()}`;
          const seen = localStorage.getItem(k);
          if (!seen) setOpen(true);
        }
      } catch {}
    })();
  }, []);

  function dismiss() {
    if (top) {
      const k = `ann_seen_${top.id}_${new Date(top.updatedAt).getTime()}`;
      localStorage.setItem(k, "1");
    }
    setOpen(false);
  }

  if (!open || !top) return null;

  return (
    <div className="ann-modal-mask" onClick={dismiss}>
      <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ann-title">{top.title}</div>
        <div className="ann-body">{top.body}</div>
        <div className="ann-actions">
          <button className="ann-btn" onClick={dismiss}>知道了</button>
        </div>
      </div>
    </div>
  );
}
