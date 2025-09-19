// components/profile/FriendWall.tsx
"use client";

import { useEffect, useState } from "react";

type WallItem = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl?: string | null; vipTier: number };
};

export default function FriendWall() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  const load = async (reset = false) => {
    if (done && !reset) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (!reset && cursor) qs.set("cursor", cursor);
      const r = await fetch(`/api/wall/friends?${qs.toString()}`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) {
        setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
        setCursor(d.nextCursor || null);
        setDone(!d.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/wall/post", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setText("");
        // 重新載入首屏
        setCursor(null);
        setDone(false);
        await load(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pf-card pf-tilt" style={{ marginTop: 16 }}>
      <div className="p-4">
        <h2 className="pf-name" style={{ fontSize: 18, marginBottom: 8 }}>好友牆</h2>

        {/* 發文 */}
        <div className="pf-grid" style={{ marginBottom: 12 }}>
          <div className="pf-field wide">
            <textarea
              placeholder=" "
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <label>分享近況（最多 500 字）</label>
          </div>
          <div className="pf-actions">
            <button className="pf-btn" onClick={post} disabled={busy || !text.trim()}>
              發佈
            </button>
          </div>
        </div>

        {/* 貼文列表 */}
        {items.length === 0 && !loading ? (
          <div className="pf-help">目前沒有貼文</div>
        ) : (
          <ul className="pf-wall">
            {items.map((it) => (
              <li key={it.id} className="pf-post">
                <img className="pf-ava-s" src={it.author.avatarUrl || "/avatar-fallback.png"} alt="" />
                <div className="pf-post-main">
                  <div className="pf-post-hd">
                    <b>{it.author.displayName || "玩家"}</b>
                    <small>VIP {it.author.vipTier}</small>
                    <span className="pf-post-time">
                      {new Date(it.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="pf-post-body">{it.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 載入更多 */}
        <div className="pf-actions">
          <button className="pf-btn ghost" onClick={() => load()} disabled={loading || done}>
            {done ? "沒有更多了" : loading ? "載入中…" : "載入更多"}
          </button>
        </div>
      </div>

      <div className="pf-ring pf-ring-1" />
      <div className="pf-ring pf-ring-2" />
    </div>
  );
}
