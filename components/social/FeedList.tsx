'use client';

import { useEffect, useRef, useState } from 'react';

type Comment = {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  body: string;
  createdAt: string;
};

type Post = {
  id: string;
  authorId: string;
  authorName: string;
  avatarUrl?: string | null;
  body: string;
  mediaUrl?: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
};

type FeedListProps = {
  refreshFlag: number;
};

export default function FeedList({ refreshFlag }: FeedListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // === 主 feed 載入 ===
  useEffect(() => {
    setPosts([]);
    setPage(0);
    setHasMore(true);
  }, [refreshFlag]);

  useEffect(() => {
    if (!hasMore) return;
    const fetchPage = async () => {
      const res = await fetch(`/api/social/feed?page=${page}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.items?.length) {
        setPosts((prev) => [...prev, ...data.items]);
      }
      if (!data.items || data.items.length === 0) {
        setHasMore(false);
      }
    };
    fetchPage();
  }, [page, hasMore]);

  // === IntersectionObserver for 無限滾動 ===
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        setPage((p) => p + 1);
      }
    });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="s-list">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && <div ref={loaderRef} className="s-center s-mt-16">載入中…</div>}
    </div>
  );
}

// ===== 單篇貼文卡 =====
function PostCard({ post }: { post: Post }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="s-card padded post-card">
      <div className="s-flex s-gap-10">
        <img src={post.avatarUrl ?? '/default-avatar.png'} className="s-avatar" alt="avatar" />
        <div>
          <div className="s-card-title">{post.authorName}</div>
          <div className="s-card-subtitle">
            {new Date(post.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="post-body s-mt-12">{post.body}</div>

      {post.mediaUrl && (
        <img src={post.mediaUrl} alt="media" className="post-media s-mt-12" />
      )}

      <div className="post-footer s-mt-12">
        <button className="s-btn sm" onClick={() => alert('Like!')}>
          ❤️ {post.likeCount}
        </button>
        <button className="s-btn sm" onClick={() => setShowComments((v) => !v)}>
          💬 {post.commentCount}
        </button>
      </div>

      {showComments && (
        <CommentPanel postId={post.id} />
      )}
    </div>
  );
}

// ===== 留言面板 (內建無限滾動) =====
function CommentPanel({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState('');

  // 初始載入
  useEffect(() => {
    setComments([]);
    setPage(0);
    setHasMore(true);
  }, [postId]);

  useEffect(() => {
    if (!hasMore) return;
    const fetchComments = async () => {
      const res = await fetch(`/api/social/comments?postId=${postId}&page=${page}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.items?.length) {
        setComments((prev) => [...prev, ...data.items]);
      }
      if (!data.items || data.items.length === 0) {
        setHasMore(false);
      }
    };
    fetchComments();
  }, [page, hasMore, postId]);

  // infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((p) => p + 1);
      }
    });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, []);

  // 發送留言
  const submitComment = async () => {
    if (!text.trim()) return;
    await fetch('/api/social/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, body: text }),
    });
    setText('');
    setPage(0);
    setComments([]);
    setHasMore(true);
  };

  return (
    <div className="s-col s-gap-10 s-mt-12">
      <div className="s-list">
        {comments.map((c) => (
          <div key={c.id} className="s-list-item">
            <img src={c.avatarUrl ?? '/default-avatar.png'} className="s-avatar" alt="avatar" />
            <div>
              <div className="s-card-title">{c.userName}</div>
              <div className="post-body">{c.body}</div>
            </div>
            <div className="s-card-subtitle">{new Date(c.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {hasMore && <div ref={loaderRef} className="s-center s-mt-8">載入留言中…</div>}
      </div>

      <div className="dm-inputbar">
        <input
          className="s-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="寫下留言..."
        />
        <button className="s-btn primary" onClick={submitComment}>送出</button>
      </div>
    </div>
  );
}
