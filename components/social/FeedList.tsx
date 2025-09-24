"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Feed = {
  id: string;
  body: string;
  imageUrl?: string | null;
  likeCount: number;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
};

export default function FeedList() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // === 載入貼文 ===
  const loadFeeds = useCallback(async () => {
    const res = await fetch("/api/social/feed/list");
    const data = await res.json();
    setFeeds(data.items);
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // === 按讚 / 取消讚 ===
  async function toggleLike(feedId: string) {
    const liked = likedMap[feedId];
    await fetch("/api/social/feed/like", {
      method: liked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedId }),
    });

    setFeeds((prev) =>
      prev.map((f) =>
        f.id === feedId
          ? { ...f, likeCount: f.likeCount + (liked ? -1 : 1) }
          : f
      )
    );

    setLikedMap((prev) => ({ ...prev, [feedId]: !liked }));
  }

  return (
    <div className="feed-list">
      {feeds.map((f) => (
        <article key={f.id} className="feed-card glass">
          <header>
            <img src={f.user.avatarUrl ?? "/default-avatar.png"} alt="avatar" />
            <span>{f.user.displayName}</span>
          </header>
          <p>{f.body}</p>
          {f.imageUrl && <img src={f.imageUrl} alt="pic" />}
          <footer>
            <button
              className={`btn small ${likedMap[f.id] ? "active" : ""}`}
              onClick={() => toggleLike(f.id)}
            >
              {likedMap[f.id] ? "💖" : "🤍"} {f.likeCount}
            </button>
          </footer>
        </article>
      ))}

      <div ref={loaderRef} className="loader">載入中…</div>
    </div>
  );
}
