"use client";

import { useEffect, useState } from "react";

type Wallet = { balance: number; bankBalance: number } | null;

const ROOMS = [
  { code: "R30", name: "30秒房", desc: "快速局，節奏帶感" },
  { code: "R60", name: "60秒房", desc: "標準局，剛剛好" },
  { code: "R90", name: "90秒房", desc: "慢節奏，穩中求勝" },
];

export default function CasinoLobby() {
  const [wallet, setWallet] = useState<Wallet>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/wallet", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setWallet({ balance: data.balance ?? 0, bankBalance: data.bankBalance ?? 0 });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* 頂部：Title + 快速餘額 */}
      <header className="max-w-6xl mx-auto mb-2 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[.2em]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-200 to-brand-500">
              TOPZCASINO
            </span>
          </h1>
          <p className="opacity-70 mt-1">選擇您的遊戲，祝您好手氣！</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-4">
            <div className="text-sm">
              <div className="opacity-70">錢包</div>
              <div className="font-semibold">{loading ? "—" : (wallet?.balance ?? 0).toLocaleString()}</div>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-sm">
              <div className="opacity-70">銀行</div>
              <div className="font-semibold">{loading ? "—" : (wallet?.bankBalance ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <a href="/auth/login" className="badge hover:brightness-110">切換帳號</a>
        </div>
      </header>

      {/* 區塊 1：銀行卡片 */}
      <section className="max-w-6xl mx-auto">
        <div className="glass-strong neon rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold tracking-wide">銀行服務</div>
              <div className="text-sm opacity-70">錢包與銀行互轉、快速補款</div>
            </div>
            <a href="/bank" className="btn rounded-lg">進入銀行</a>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="glass rounded-xl p-4">
              <div className="text-sm opacity-70">錢包餘額</div>
              <div className="text-3xl font-extrabold">{loading ? "—" : (wallet?.balance ?? 0).toLocaleString()}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-sm opacity-70">銀行餘額</div>
              <div className="text-3xl font-extrabold">{loading ? "—" : (wallet?.bankBalance ?? 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 區塊 2：百家卡片（內含三個房間卡片） */}
      <section className="max-w-6xl mx-auto">
        <div className="glass-strong neon rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold tracking-wide">百家樂</div>
              <div className="text-sm opacity-70">倒數、路子圖、開牌動畫房內呈現</div>
            </div>
            <a href="/casino/baccarat/R60" className="btn rounded-lg">直接進 R60</a>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {ROOMS.map((r, i) => (
              <a
                key={r.code}
                href={`/casino/baccarat/${r.code}`}
                className="group relative block rounded-2xl glass p-6 overflow-hidden transition hover:scale-[1.01] hover:shadow-lg"
                style={{ animation: `fadeIn .4s ease ${i * 0.05}s both` } as any}
              >
                {/* 裝飾背景光 */}
                <div
                  className="pointer-events-none absolute -z-10 -inset-1 opacity-0 group-hover:opacity-30 transition"
                  style={{
                    background:
                      "radial-gradient(600px 200px at 0% 0%, rgba(86,116,255,.35), transparent), radial-gradient(600px 200px at 100% 100%, rgba(34,197,94,.35), transparent)",
                  }}
                />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold tracking-wide">{r.name}</div>
                    <div className="text-sm opacity-70">{r.desc}</div>
                  </div>
                  <span className="text-xs opacity-80 px-2 py-1 rounded-md border border-white/15">{r.code}</span>
                </div>
                <div className="mt-5">
                  <div className="h-20 rounded-xl bg-black/20 border border-white/10 grid place-items-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(closest-side, rgba(86,116,255,.3), transparent)" }} />
                    <div className="text-sm opacity-80">進入房間</div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 shimmer" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
