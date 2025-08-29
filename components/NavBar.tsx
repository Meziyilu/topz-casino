// components/NavBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = { email: string; isAdmin: boolean } | null;

export default function NavBar() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!stop) setMe(res.ok ? await res.json() : null);
      } catch {
        if (!stop) setMe(null);
      } finally {
        if (!stop) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  return (
    <nav className="w-full flex items-center justify-between py-3 px-4 glass glow-ring">
      <div className="flex items-center gap-3">
        <Link href="/lobby" className="font-black tracking-wider">TOPZCASINO</Link>
        <Link href="/lobby" className="opacity-80 hover:opacity-100">大廳</Link>
        <Link href="/bank" className="opacity-80 hover:opacity-100">銀行</Link>
        <Link href="/casino/baccarat/R30" className="opacity-80 hover:opacity-100">百家 30s</Link>
        <Link href="/casino/baccarat/R60" className="opacity-80 hover:opacity-100">百家 60s</Link>
        <Link href="/casino/baccarat/R90" className="opacity-80 hover:opacity-100">百家 90s</Link>
        {me?.isAdmin && <Link href="/admin" className="opacity-80 hover:opacity-100">管理員</Link>}
      </div>

      <div className="flex items-center gap-3">
        {loading ? (
          <span className="text-sm opacity-70">載入中…</span>
        ) : me ? (
          <>
            <span className="text-sm opacity-80">{me.email}</span>
            <button
              className="btn"
              onClick={async () => {
                // 你的登出 API：若 /api/auth/logout 沒有，沿用你之前的 /api/auth/login?logout=1
                await fetch("/api/auth/login?logout=1", {
                  method: "POST",
                  credentials: "include",
                }).catch(() => {});
                location.href = "/auth";
              }}
            >
              登出
            </button>
          </>
        ) : (
          <Link href="/auth" className="btn">登入 / 註冊</Link>
        )}
      </div>
    </nav>
  );
}
