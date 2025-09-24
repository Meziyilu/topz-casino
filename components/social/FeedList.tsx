"use client";

import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe?: boolean;
};

export default function FeedList({ refreshFlag }: { refreshFlag: number }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/social/feed/list");
        const data = await res.json();
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshFlag]); // 每次 refreshFlag 改變 → 重新拉取

  return (
    <div className="feed-list">
      {loading && <p>載入中...</p>}
      {items.length === 0 && !loading && <p>還沒有貼文</p>}
      {items.map((p) => (
        <div key={p.id} className="feed-item glass">
          <div className="meta">
            <span className="user">👤 {p.userId}</span>
            <span className="time">{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <p className="body">{p.content}</p>
          {p.imageUrl && <img src={p.imageUrl} alt="post" />}
          <div className="actions">
            ❤️ {p.likeCount}
          </div>
        </div>
      ))}
    </div>
  );
}
