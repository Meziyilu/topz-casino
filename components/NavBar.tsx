"use client";

import Link from "next/link";
import useSWR from "swr";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

export default function NavBar() {
  const { data: me } = useSWR("/api/auth/me", fetcher, { refreshInterval: 60000 });
  const isAdmin = !!me?.isAdmin;

  return (
    <nav className="w-full sticky top-0 z-30 bg-black/30 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between text-white">
        <Link href="/" className="font-extrabold tracking-wide">TOPZCASINO</Link>
        <div className="flex items-center gap-3">
          <Link className="hover:underline" href="/casino">大廳</Link>
          <Link className="hover:underline" href="/casino/bank">銀行 / 錢包</Link>
          {isAdmin && (
            <Link className="hover:underline font-bold" href="/admin">管理員</Link>
          )}
          <span className="text-xs opacity-70">
            {me?.email ? me.email : "未登入"}
          </span>
        </div>
      </div>
    </nav>
  );
}
