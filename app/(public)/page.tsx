"use client";
import { useEffect, useState } from "react";

type Me = { id: string; email: string; displayName: string; isAdmin: boolean; balance: number; bankBalance: number; };

export default function Lobby() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/users/me", { credentials: "include", cache: "no-store" });
      const j = await r.json();
      setMe(j.me ?? null);
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    location.href = "/login";
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl mb-2">大廳</h1>
      {!me ? <div>載入中...</div> : (
        <div className="space-y-2">
          <div>Hi，<b>{me.displayName}</b>（{me.email}）{me.isAdmin && <span className="ml-2 text-xs px-2 py-0.5 border rounded">Admin</span>}</div>
          <div>錢包：{me.balance}　銀行：{me.bankBalance}</div>
          <button className="border px-3 py-1 rounded" onClick={logout}>登出</button>
        </div>
      )}
    </main>
  );
}
