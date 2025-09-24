// app/social/feed/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import '@/public/styles/social.css';

// 這兩個元件本身應該也是 'use client' 的（你的程式裡已經是）
// 如果不是，請在它們檔案最上面加上 'use client'
const PostComposer = dynamic(() => import('@/components/social/PostComposer'), { ssr: false });
const FeedList = dynamic(() => import('@/components/social/FeedList'), { ssr: false });

type Post = {
  id: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
  likesCount: number;
  likedByMe?: boolean;
};

export default function SocialFeedPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (!reset && cursor) qs.set('cursor', cursor);
      const r = await fetch(`/api/social/feed?${qs}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('failed');
      const d = await r.json();
      setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
      setCursor(d.nextCursor ?? null);
      setHasMore(!!d.nextCursor);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => { load(true); /* 初次載入 */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePosted = (newPost: Post) => {
    // 讓新貼文即時插到最上面
    setItems((prev) => [newPost, ...prev]);
  };

  const handleLikeToggle = async (postId: string) => {
    // 前端先行更新（optimistic）
    setItems((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      )
    );
    try {
      await fetch(`/api/social/feed/like`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
    } catch {
      // 還原
      setItems((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: !p.likedByMe,
                likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1,
              }
            : p
        )
      );
    }
  };

  return (
    <main className="social-wrap">
      <section className="s-card padded">
        <h1 className="s-card-title">社交動態</h1>
        <p className="s-card-subtitle">發佈貼文、上傳圖片、按讚、留言</p>

        {/* Composer（上傳 + 發文）—— onPosted 是在 client 這層定義的，不會再觸發 Server→Client 事件傳遞錯誤 */}
        <PostComposer onPosted={handlePosted} />
      </section>

      <section className="s-card padded post-card">
        <FeedList
          items={items}
          onEndReached={() => hasMore && !loading && load()}
          onLikeToggle={handleLikeToggle}
        />
        {!hasMore && <div className="s-mt-12 s-center s-text-dim">沒有更多了</div>}
      </section>
    </main>
  );
}
