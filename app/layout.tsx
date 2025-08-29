// components/NavBar.tsx
"use client";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

export default function NavBar() {
  const { data } = useSWR("/api/auth/me", fetcher, { refreshInterval: 5000 });

  return (
    <div className="w-full py-3 px-4 flex items-center justify-between bg-black/30 backdrop-blur-md border-b border-white/10">
      <Link href="/lobby" className="font-black tracking-widest">TOPZCASINO</Link>
      <div className="text-sm opacity-80">
        {data?.email ? (
          <span>Hi, {data.email}</span>
        ) : (
          <Link className="underline" href="/auth">
            登入/註冊
          </Link>
        )}
      </div>
    </div>
  );
}
