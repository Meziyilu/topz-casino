// app/announcements/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { Announcement } from "@/components/lobby/AnnouncementCard";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await fetch(`/api/announcements/active?limit=100&t=${Date.now()}`, { cache: "no-store" });
      const d = await r.json();
      if (alive) setItems(d.items ?? []);
    };
    load();
    return () => { alive = false; };
  }, []);

  const isLoading = items === null;

  return (
    <main className="container" style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>公告列表</h1>
      {isLoading && <div className="lb-muted">載入中…</div>}

      {!isLoading && (!items || items.length === 0) && <div className="lb-muted">目前沒有公告</div>}

      {!isLoading && items && items.map((a) => (
        <article key={a.id} className="glass" style={{ padding: 16, borderRadius: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{a.title}</h2>
          <div className="lb-muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>
            {a.updatedAt ? new Date(a.updatedAt).toLocaleString() :
              a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
          </div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{a.body}</div>
        </article>
      ))}
    </main>
  );
}
