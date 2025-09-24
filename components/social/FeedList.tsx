// components/social/FeedList.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  user: { displayName: string; avatarUrl?: string | null };
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
};

export default function FeedList({ refreshFlag = 0 }: { refreshFlag?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  async function loadMore(reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL("/api/social/feed/list", window.location.origin);
      if (!reset && cursor) url.searchParams.set("cursor", cursor);
      const r = await fetch(url.toString(), { cache: "no-store" });
      const d = await r.json();
      setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
      setCursor(d.nextCursor ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshFlag]);

  useEffect(() => {
    if (!observerRef.current) return;
    const el = observerRef.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (cursor) loadMore();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor]);

  async function like(id: string) {
    await fetch("/api/social/feed/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    }).catch(() => {});
    setItems((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              liked: !it.liked,
              likeCount: (it.likeCount ?? 0) + (it.liked ? -1 : 1),
            }
          : it
      )
    );
  }

  return (
    <div className="feed-list">
      {items.length === 0 && !loading && <div className="feed-empty">目前還沒有內容</div>}

      {items.map((it) => {
        const imgs = (it.imageUrl ?? "")
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const cls =
          imgs.length <= 1 ? "one" : imgs.length === 2 ? "two" : imgs.length === 3 ? "three" : "four";
        return (
          <article key={it.id} className="post-card">
            {/* 頭部 */}
            <header className="post-head">
              <img className="ph-avatar" src={it.user.avatarUrl ?? "/img/avatar-default.png"} alt="" />
              <div className="ph-meta">
                <div className="ph-name">{it.user.displayName}</div>
                <div className="ph-time">{new Date(it.createdAt).toLocaleString()}</div>
              </div>
              <button className="ph-more s-icon-btn" aria-label="更多" data-sound>⋯</button>
            </header>

            {/* 文字 */}
            {it.body && <div className="post-body">{it.body}</div>}

            {/* 圖片 */}
            {imgs.length > 0 && (
              <div className={`post-media-grid ${cls}`}>
                {imgs.slice(0, 4).map((u) => (
                  <div className="post-media" key={u}>
                    <img src={u} alt="" />
                  </div>
                ))}
              </div>
            )}

            {/* 動作列 */}
            <div className="post-actions">
              <button
                className={`pa-btn ${it.liked ? "active" : ""}`}
                onClick={() => like(it.id)}
                data-sound
              >
                ❤️ {it.likeCount ?? 0}
              </button>
              <button className="pa-btn" data-sound>💬 {it.commentCount ?? 0}</button>
              <button className="pa-btn" data-sound>↗ 分享</button>
            </div>

            {/* （選配）留言區：你已有留言 API 的話就掛在這 */}
            {/* <div className="comments">
              <div className="comment-item">
                <img className="ci-avatar" src="/img/avatar-default.png" alt="" />
                <div className="ci-bubble">留言內容範例</div>
              </div>
              <form className="comment-form">
                <input placeholder="寫下留言…" />
                <button type="submit" data-sound>送出</button>
              </form>
            </div> */}
          </article>
        );
      })}

      {/* loading / sentinel */}
      {loading && (
        <div className="feed-loading" role="status" aria-live="polite">
          <span className="loader-dot"></span>
          <span className="loader-dot"></span>
          <span className="loader-dot"></span>
          載入中…
        </div>
      )}
      {/* 無限滾動觸發器 */}
      <div ref={observerRef} style={{ height: 1 }} />
    </div>
  );
}
