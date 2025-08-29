// components/NavBar.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

export default function NavBar() {
  const { data } = useSWR("/api/auth/me", fetcher);
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function logout() {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/auth");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const linkCls = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm ${active ? "bg-white/15" : "hover:bg-white/10"}`;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-black/30 border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/lobby" className="font-extrabold tracking-widest">TOPZCASINO</Link>
        <nav className="flex items-center gap-2">
          <Link href="/lobby" className={linkCls(pathname?.startsWith("/lobby") ?? false)}>大廳</Link>
          <Link href="/bank" className={linkCls(pathname?.startsWith("/bank") ?? false)}>銀行</Link>
          {data?.isAdmin ? (
            <Link href="/admin" className={linkCls(pathname?.startsWith("/admin") ?? false)}>管理員</Link>
          ) : null}
          <div className="mx-2 h-5 w-px bg-white/20" />
          {data?.email ? (
            <>
              <span className="text-xs text-white/80 hidden sm:inline">{data.email}</span>
              <button onClick={logout} disabled={loading} className="btn px-3 py-1.5 text-sm">
                {loading ? "登出中…" : "登出"}
              </button>
            </>
          ) : (
            <Link href="/auth" className="btn px-3 py-1.5 text-sm">登入 / 註冊</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
