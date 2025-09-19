// components/profile/FriendsPanel.tsx
"use client";

import { useEffect, useState } from "react";

type Friend = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  vipTier: number;
  since: string;
};

export default function FriendsPanel() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/friends", { credentials: "include" });
      const d = await r.json();
      if (r.ok) setFriends(d.friends || []);
      else setToast(d.error || "讀取好友失敗");
    } catch {
      setToast("讀取好友失敗");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 1500);
    }
  };

  useEffect(() => { load(); }, []);

  const addFriend = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/friends/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "ADD_FAILED");
      setEmail("");
      setToast("已新增好友 ✅");
      await load();
    } catch (e: any) {
      setToast(`新增失敗：${e?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1500);
    }
  };

  const removeFriend = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "REMOVE_FAILED");
      setToast("已刪除好友 🗑️");
      await load();
    } catch (e: any) {
      setToast(`刪除失敗：${e?.message || "未知錯誤"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1500);
    }
  };

  return (
    <div className="pf-card pf-tilt" style={{ marginTop: 16 }}>
      <div className="p-4">
        <h2 className="pf-name" style={{ fontSize: 18, marginBottom: 8 }}>好友</h2>

        {/* 新增好友（Email） */}
        <div className="pf-grid" style={{ marginBottom: 12 }}>
          <div className="pf-field wide">
            <input
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <label>以 Email 新增好友</label>
          </div>
          <div className="pf-actions">
            <button className="pf-btn" onClick={addFriend} disabled={busy || !email.trim()}>
              新增好友
            </button>
          </div>
        </div>

        {/* 好友清單 */}
        {loading ? (
          <div className="pf-help">讀取中…</div>
        ) : friends.length === 0 ? (
          <div className="pf-help">尚無好友</div>
        ) : (
          <ul className="pf-list">
            {friends.map((f) => (
              <li key={f.id} className="pf-friend">
                <img className="pf-ava-s" src={f.avatarUrl || "/avatar-fallback.png"} alt="" />
                <div className="pf-friend-meta">
                  <b>{f.displayName || f.email}</b>
                  <small>VIP {f.vipTier}</small>
                </div>
                <button className="pf-btn ghost" onClick={() => removeFriend(f.id)} disabled={busy}>
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && <div className="pf-toast ok">{toast}</div>}
      <div className="pf-ring pf-ring-1" />
      <div className="pf-ring pf-ring-2" />
    </div>
  );
}
