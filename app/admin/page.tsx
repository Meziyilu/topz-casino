// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { id: string; email: string; isAdmin: boolean } | null;
type UserItem = { id: string; email: string; name: string | null; isAdmin: boolean; balance: number; bankBalance: number; createdAt: string };

export default function AdminPage() {
  const [me, setMe] = useState<Me>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [tab, setTab] = useState<"users" | "adjust" | "rooms">("users");

  // users
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errUsers, setErrUsers] = useState<string | null>(null);

  // adjust
  const [email, setEmail] = useState("");
  const [delta, setDelta] = useState(0);
  const [target, setTarget] = useState<"WALLET" | "BANK">("WALLET");
  const [memo, setMemo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // rooms
  const [roomsMsg, setRoomsMsg] = useState<string | null>(null);
  const [roomsErr, setRoomsErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const j = await r.json();
        setMe(j.user ?? null);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  async function loadUsers() {
    setErrUsers(null);
    setLoadingUsers(true);
    try {
      const r = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
        cache: "no-store",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "載入失敗");
      setUsers(j.users || []);
    } catch (e: any) {
      setErrUsers(e.message || "發生錯誤");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (me?.isAdmin) loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null); setBusy(true);
    try {
      const r = await fetch("/api/admin/wallet/adjust", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, delta: Number(delta), target, memo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "調整失敗");
      setMsg(`成功。錢包：${j.balance}，銀行：${j.bankBalance}`);
      setEmail(""); setDelta(0); setMemo("");
      // 調整成功後更新列表
      loadUsers();
    } catch (e: any) {
      setErr(e.message || "發生錯誤");
    } finally {
      setBusy(false);
    }
  }

  async function restartRoom(code: "R30" | "R60" | "R90") {
    setRoomsMsg(null); setRoomsErr(null);
    try {
      const r = await fetch(`/api/admin/rooms/reset`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: code }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "操作失敗");
      setRoomsMsg(`已重啟 ${code}。${j.message ?? ""}`);
    } catch (e: any) {
      setRoomsErr(e.message || "發生錯誤");
    }
  }

  if (loadingMe) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        載入中…
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-8 rounded-2xl max-w-md w-full text-white text-center">
          <h1 className="text-2xl font-bold mb-4">需要管理員權限</h1>
          <p className="opacity-80 mb-6">請以管理員帳號登入後再試。</p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth" className="btn">前往登入</Link>
            <Link href="/lobby" className="btn opacity-80">回大廳</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold tracking-wider">管理員面板</h1>
          <div className="flex items-center gap-3">
            <Link href="/lobby" className="btn">回大廳</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button className={`btn ${tab === "users" ? "" : "opacity-60"}`} onClick={() => setTab("users")}>使用者列表</button>
          <button className={`btn ${tab === "adjust" ? "" : "opacity-60"}`} onClick={() => setTab("adjust")}>金額調整</button>
          <button className={`btn ${tab === "rooms" ? "" : "opacity-60"}`} onClick={() => setTab("rooms")}>房間控制</button>
        </div>

        {/* Users */}
        {tab === "users" && (
          <div className="glass rounded-2xl p-6">
            <div className="flex gap-2 mb-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜尋 Email 或名稱"
                className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 outline-none"
              />
              <button className="btn" onClick={loadUsers} disabled={loadingUsers}>
                {loadingUsers ? "查詢中…" : "查詢"}
              </button>
            </div>

            {errUsers && <p className="text-red-400 mb-3">{errUsers}</p>}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-300">
                  <tr>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">名稱</th>
                    <th className="py-2 pr-4">Admin</th>
                    <th className="py-2 pr-4">錢包</th>
                    <th className="py-2 pr-4">銀行</th>
                    <th className="py-2">建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-white/10">
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 pr-4">{u.name ?? "-"}</td>
                      <td className="py-2 pr-4">{u.isAdmin ? "✓" : "-"}</td>
                      <td className="py-2 pr-4">{u.balance}</td>
                      <td className="py-2 pr-4">{u.bankBalance}</td>
                      <td className="py-2">{new Date(u.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center opacity-70">無資料</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Adjust */}
        {tab === "adjust" && (
          <div className="glass rounded-2xl p-6 max-w-xl">
            <form onSubmit={submitAdjust} className="space-y-4">
              <div>
                <label className="block text-sm opacity-80 mb-1">使用者 Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm opacity-80 mb-1">調整金額（可正負）</label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 outline-none"
                  placeholder="例如：100 或 -50"
                />
              </div>
              <div>
                <label className="block text-sm opacity-80 mb-1">目標</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as any)}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 outline-none"
                >
                  <option value="WALLET">錢包</option>
                  <option value="BANK">銀行</option>
                </select>
              </div>
              <div>
                <label className="block text-sm opacity-80 mb-1">備註（可空白）</label>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 outline-none"
                  placeholder="操作備註"
                />
              </div>

              {err && <p className="text-red-400">{err}</p>}
              {msg && <p className="text-emerald-400">{msg}</p>}

              <button className="btn w-full" disabled={busy}>
                {busy ? "送出中…" : "送出"}
              </button>
            </form>
          </div>
        )}

        {/* Rooms */}
        {tab === "rooms" && (
          <div className="glass rounded-2xl p-6 max-w-xl">
            <p className="mb-3 opacity-80">重啟房間會把當前局快速結算並開新局。</p>
            <div className="flex gap-3 flex-wrap">
              {(["R30", "R60", "R90"] as const).map(code => (
                <button key={code} className="btn" onClick={() => restartRoom(code)}>
                  重啟 {code}
                </button>
              ))}
            </div>
            {roomsErr && <p className="text-red-400 mt-4">{roomsErr}</p>}
            {roomsMsg && <p className="text-emerald-400 mt-4">{roomsMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
