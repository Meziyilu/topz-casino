// components/lobby/AnnouncementCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
};

type Props = {
  title?: string;          // 卡片標題
  limit?: number;          // 顯示筆數
  showUpdatedAt?: boolean; // 要不要顯示更新時間
  className?: string;      // 外部自訂樣式
  viewAllHref?: string;    // “查看全部” 連結
  emptyText?: string;      // 無資料時顯示文字
  debug?: boolean;         // console 偵錯
};

export default function AnnouncementCard({
  title = "公告",
  limit = 6,
  showUpdatedAt = false,
  className = "",
  viewAllHref = "/announcements",
  emptyText = "目前沒有公告",
  debug = false,
}: Props) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/announcements/active?limit=${limit}&t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        const list = (d.items ?? []) as Announcement[];
        if (debug) console.log("[AnnouncementCard]", list);
        if (alive) {
          setItems(list);
          setError(null);
        }
      } catch (e: any) {
        if (alive) {
          setItems([]);
          setError(e?.message ?? "load error");
        }
      }
    };
    load();
    return () => { alive = false; };
  }, [limit, debug]);

  const isLoading = items === null;

  return (
    <div className={`lb-card ${className}`}>
      <div className="lb-card-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span>{title}</span>
        {viewAllHref && (
          <Link href={viewAllHref} className="lb-btn-mini ghost">查看全部</Link>
        )}
      </div>

      <ul className="lb-list soft" aria-busy={isLoading}>
        {isLoading && (
          <>
            <li className="ann-item skeleton" />
            <li className="ann-item skeleton" />
            <li className="ann-item skeleton" />
          </>
        )}

        {!isLoading && items && items.length === 0 && (
          <li className="lb-muted">{emptyText}</li>
        )}

        {!isLoading && items && items.map((a) => (
          <li key={a.id} className="ann-item">
            <div className="ann-title" style={{ fontWeight: 700 }}>{a.title}</div>
            {showUpdatedAt && (
              <div className="ann-meta lb-muted" style={{ fontSize: 12, marginTop: 2 }}>
                {a.updatedAt ? new Date(a.updatedAt).toLocaleString() :
                  a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
              </div>
            )}
            <div className="ann-body" style={{ marginTop: 6, lineHeight: 1.5 }}>{a.body}</div>
          </li>
        ))}
      </ul>

      {/* 快速骨架樣式（可拿掉用你原本的 class） */}
      <style jsx>{`
        .skeleton { height: 52px; background: linear-gradient(90deg, #00000020, #ffffff10, #00000020); border-radius: 8px; }
      `}</style>
    </div>
  );
}
