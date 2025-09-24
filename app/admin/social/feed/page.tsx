'use client';

import { useState } from 'react';

export default function AdminFeedModeration() {
  const [postId, setPostId] = useState('');
  const [hidden, setHidden] = useState(true);
  const [msg, setMsg] = useState('');

  async function submit() {
    const r = await fetch('/api/admin/social/feed/hide', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId, hidden }),
    });
    const d = await r.json();
    setMsg(r.ok ? '已更新' : `失敗：${d.error || 'ERROR'}`);
  }

  return (
    <main className="s-col s-gap-12">
      <h1 className="s-card-title">社交動態審核</h1>
      <div className="s-card s-col s-gap-10">
        <input className="s-input" placeholder="Post ID" value={postId} onChange={e => setPostId(e.target.value)} />
        <label className="s-flex s-gap-8">
          <input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} />
          隱藏（勾選=隱藏）
        </label>
        <button className="s-btn primary" onClick={submit} data-sound>更新</button>
        {msg && <div className="s-card-subtitle">{msg}</div>}
      </div>
    </main>
  );
}
