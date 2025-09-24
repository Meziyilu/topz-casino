'use client';

import { useState } from 'react';

export default function PostComposer() {
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/social/wall/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        setBody('');
        setImageUrl('');
        // 讓外層列表自己刷新：發出簡單事件（可由 FeedList 監聽）
        window.dispatchEvent(new CustomEvent('post:created'));
      } else {
        console.warn('Post failed', await res.text());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-4 rounded-xl space-y-3">
      <textarea
        className="input w-full min-h-24"
        placeholder="分享點什麼……"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="（可選）圖片 URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <button className="btn" onClick={submit} disabled={loading}>
          {loading ? '送出中…' : '送出'}
        </button>
      </div>
    </div>
  );
}
