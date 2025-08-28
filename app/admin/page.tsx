"use client";

import { useEffect, useState } from "react";

type Me = { id: string; email: string; isAdmin: boolean } | null;

export default function AdminPage() {
  const [me, setMe] = useState<Me>(null);
  const [status, setStatus] = useState<string | null>(null);

  // 調整錢包
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [target, setTarget] = useState<"WALLET"|"BANK">("WALLET");
  const [delta, setDelta] = useState<number>(1000);
  const [memo, setMemo] = useState("管理員調整");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) setMe(data);
      } catch {}
    })();
  }, []);

  async function adjustWallet() {
    setStatus(null);
    try {
      const res = await fetch("/api/admin/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          userId: userId || undefined,
          email: userEmail || undefined,
          target,
          delta,
          memo,
        }),
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.error || "調整失敗");
      setStatus("✅ 調整成功");
    } catch (e:any) {
      setStatus(`❌ ${e?.message || "調整失敗"}`);
    }
  }

  async function restart(roomCode: "R30"|"R60"|"R90") {
    setStatus(null);
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${roomCode}&force=restart`, { cache: "no-store" });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.error || "重啟失敗");
      setStatus(`✅ 已重啟 ${roomCode}`);
    } catch (e:any) {
      setStatus(`❌ ${e?.message || "重啟失敗"}`);
    }
  }

  async function resetAllRooms() {
    setStatus(null);
    try {
      const res = await fetch("/api/admin/rooms/reset", { method: "POST" });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.error || "重置失敗");
      setStatus("✅ 已清空並重建三間房，且開啟新局");
    } catch (e:any) {
      setStatus(`❌ ${e?.message || "重置失敗"}`);
    }
  }

  if (!me) {
    return (
      <div className="min-h-screen p-6 grid place-items-center">
        <div className="glass rounded-xl p-6">
          <div className="text-center">請先登入…</div>
          <div className="text-center mt-2"><a className="underline" href="/auth/login">前往登入</a></div>
        </div>
      </div>
    );
  }

  if (!me.isAdmin) {
    return (
      <div className="min-h-screen p-6 grid place-items-center">
        <div className="glass rounded-xl p-6">
          <div className="text-center">需要管理員權限</div>
          <div className="text-center mt-2"><a className="underline" href="/casino">返回大廳</a></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[.2em]">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-200 to-brand-500">
            管理員面板
          </span>
        </h1>
        <a href="/casino" className="badge hover:brightness-110">返回大廳</a>
      </header>

      {/* 錢包調整 */}
      <section className="max-w-6xl mx-auto glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">錢包調整</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm opacity-80">UserID（擇一）</label>
            <input
              value={userId}
              onChange={e=>setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
              placeholder="使用者 ID"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm opacity-80">Email（擇一）</label>
            <input
              value={userEmail}
              onChange={e=>setUserEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm opacity-80">目標帳戶</label>
            <select
              value={target}
              onChange={e=>setTarget(e.target.value as any)}
              className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
            >
              <option value="WALLET">錢包</option>
              <option value="BANK">銀行</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm opacity-80">金額（正數加、負數減）</label>
            <input
              type="number"
              value={delta}
              onChange={e=>setDelta(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
              placeholder="例如 1000 或 -500"
            />
            <div className="flex gap-2">
              {[1000,5000,10000,-500,-1000].map(v=>(
                <button key={v} onClick={()=>setDelta(v)} className="bet-btn">{v}</button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm opacity-80">備註</label>
            <input
              value={memo}
              onChange={e=>setMemo(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
              placeholder="備註（可空白）"
            />
          </div>
        </div>

        <div className="mt-4">
          <button onClick={adjustWallet} className="btn rounded-lg">確認調整</button>
        </div>
      </section>

      {/* 房間控制 */}
      <section className="max-w-6xl mx-auto glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">房間控制</h2>
        <div className="flex flex-wrap gap-3">
          {(["R30","R60","R90"] as const).map(code=>(
            <button key={code} onClick={()=>restart(code)} className="btn rounded-lg">{code} 重啟</button>
          ))}
          <button onClick={resetAllRooms} className="btn rounded-lg">全部清空並重建</button>
        </div>
      </section>

      {status && (
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-xl p-4">{status}</div>
        </div>
      )}
    </div>
  );
}
