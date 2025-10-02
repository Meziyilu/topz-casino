'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type RawUser = {
  id?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

type RawPost = {
  id?: string;
  body?: string | null;
  createdAt?: string | number | Date | null;
  images?: string[] | null;          // 你的 API 可能叫 imageUrls / media / files
  imageUrls?: string[] | null;
  media?: string[] | null;
  files?: string[] | null;
  likeCount?: number | null;
  commentCount?: number | null;

  // 可能的作者欄位名稱
  user?: RawUser | null;
  author?: RawUser | null;
  profile?: RawUser | null;
};

type ListResp = { items?: RawPost[]; nextCursor?: string | null };

const fallbackAvatar = '/img/avatar-fallback.png'; // 沒有這張圖就放一張 1x1 透明圖也可

function normalizeItem(it: RawPost) {
  const user = it.user ?? it.author ?? it.profile ?? null;

  // 圖片欄位的容錯：挑一個存在的陣列
  const images =
    (Array.isArray(it.images) && it.images) ||
    (Array.isArray(it.imageUrls) && it.imageUrls) ||
    (Array.isArray(it.media) && it.media) ||
    (Array.isArray(it.files) && it.files) ||
    [];

  return {
    id: it.id ?? crypto.randomUUID(),
    body: it.body ?? '',
    createdAt: it.createdAt ? new Date(it.createdAt) : null,
    images,
    likeCount: typeof it.likeCount === 'number' ? it.likeCount : 0,
    commentCount: typeof it.commentCount === 'number' ? it.commentCount : 0,
    user: user
      ? {
          id: user.id ?? '',
          displayName: user.displayName ?? '用戶',
          avatarUrl: user.avatarUrl ?? null,
        }
      : null,
  };
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    try {
      return (await r.json()) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export default function FeedList({ refreshFlag = 0 }: { refreshFlag?: number }) {
  const [items, setItems] = useState<ReturnType<typeof normalizeItem>[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const qs = new URLSearchParams();
    if (!reset && cursor) qs.set('cursor', cursor);
    const data = await safeFetch<ListResp>('/api/social/feed/list' + (qs.size ? `?${qs}` : ''));

    const raw = Array.isArray(data?.items) ? data!.items! : [];
    const normalized = raw.map(normalizeItem);

    setItems(prev => (reset ? normalized : [...prev, ...normalized]));
    setCursor(data?.nextCursor ?? null);
    setHasMore(Boolean(data?.nextCursor));
    setLoading(false);
  }, [cursor, loading]);

  // 初次/手動 refresh
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    setItems([]);
    void load(true);
  }, [refreshFlag]); // eslint-disable-line react-hooks/exhaustive-deps

  // 無限滾動
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      entries => {
        const isIn = entries.some(e => e.isIntersecting);
        if (isIn && hasMore && !loading) {
          void load(false);
        }
      },
      { rootMargin: '600px 0px 600px 0px' }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, loading, load]);

  return (
    <div className="feed-list">
      {(items ?? []).length === 0 && !loading && (
        <div className="feed-empty">目前尚無貼文</div>
      )}

      {(items ?? []).map(post => {
        const u = post.user;
        const avatar = u?.avatarUrl || fallbackAvatar;
        const name = u?.displayName || '用戶';
        const when = post.createdAt ? post.createdAt.toLocaleString() : '';

        return (
          <article key={post.id} className="post-card">
            <header className="post-head">
              <img className="ph-avatar" src={avatar} alt="" />
              <div className="ph-meta">
                <div className="ph-name">{name}</div>
                <div className="ph-time">{when}</div>
              </div>
              <div className="ph-more">⋯</div>
            </header>

            {post.body && <div className="post-body">{post.body}</div>}

            {Array.isArray(post.images) && post.images.length > 0 && (
              <div
                className={`post-media-grid ${
                  post.images.length === 1
                    ? 'one'
                    : post.images.length === 2
                    ? 'two'
                    : post.images.length === 3
                    ? 'three'
                    : 'four'
                }`}
              >
                {post.images.map((url, i) => (
                  <div className="post-media" key={i}>
                    <img src={url} alt="" />
                  </div>
                ))}
              </div>
            )}

            <div className="post-actions">
              <button className="pa-btn" data-sound>
                👍 {post.likeCount}
              </button>
              <button className="pa-btn" data-sound>
                💬 {post.commentCount}
              </button>
              <button className="pa-btn" data-sound>↗ 分享</button>
            </div>
          </article>
        );
      })}

      {loading && (
        <div className="feed-loading">
          <span className="loader-dot" />
          <span className="loader-dot" />
          <span className="loader-dot" />
        </div>
      )}

      {/* 無限滾動觀測點 */}
      <div ref={sentinelRef} />
    </div>
  );
}
