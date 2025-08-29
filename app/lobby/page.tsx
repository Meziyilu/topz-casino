"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = { id: string; email: string; name?: string | null; isAdmin?: boolean } | null;
type Wallet = { balance: number; bankBalance: number };

export default function LobbyPage() {
  const [me, setMe] = useState<Me>(null);
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, bankBalance: 0 });
  const [loading, setLoading] = useState(true);

  // 初始化載入使用者與錢包
  useEffect(() => {
    (async () => {
      try {
        const [resMe, resW] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/wallet", { cache: "no-store" }),
        ]);
        const meJson = resMe.ok ? await resMe.json() : {};
        const wJson = resW.ok ? await resW.json() : {};
        setMe(meJson?.user ?? null);
        setWallet({
          balance: wJson?.balance ?? 0,
          bankBalance: wJson?.bankBalance ?? 0,
        });
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 每 10s 輕量更新錢包（不打擾伺服器）
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/wallet", { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          setWallet({
            balance: d?.balance ?? 0,
            bankBalance: d?.bankBalance ?? 0,
          });
        }
      } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0f19] to-black">
      {/* 背景裝飾 */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: "radial-gradient(closest-side, rgba(250,204,21,.35), rgba(0,0,0,0))" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-25 blur-3xl"
           style={{ background: "radial-gradient(closest-side, rgba(99,102,241,.35), rgba(0,0,0,0))" }} />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 標頭 */}
        <header className="flex items-center justify-between">
          <div>
            <div className="text-lg text-white/60">歡迎回來</div>
            <h1 className="text-3xl font-extrabold glow-text tracking-wide">
              {me?.name || me?.email || "玩家"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {me?.isAdmin && (
              <Link href="/admin" className="btn-neon px-4 py-2 rounded-md">
                管理員面板
              </Link>
            )}
            <Link href="/bank" className="btn px-4 py-2 rounded-md">
              銀行
            </Link>
          </div>
        </header>

        {/* 公告跑馬燈 */}
        <div className="glass-card p-3 marquee">
          <div className="marquee-content">
            【公告】理性娛樂，適度小賭怡情。活動：每日登入送紅利、百家滿額加碼中！
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            R30、R60、R90 三大房間火熱進行，祝各位手氣大旺！
          </div>
        </div>

        {/* 錢包面板 */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card p-5 card-glow">
            <div className="text-sm text-white/70 mb-1">錢包餘額</div>
            <div className="text-3xl font-extrabold">
              {loading ? "—" : wallet.balance.toLocaleString()}<span className="text-white/60 text-base ml-2">金幣</span>
            </div>
          </div>
          <div className="glass-card p-5 card-glow">
            <div className="text-sm text-white/70 mb-1">銀行存款</div>
            <div className="text-3xl font-extrabold">
              {loading ? "—" : wallet.bankBalance.toLocaleString()}<span className="text-white/60 text-base ml-2">金幣</span>
            </div>
          </div>
        </section>

        {/* 三個房間 */}
        <section>
          <div className="text-white/80 mb-3 font-semibold">百家樂房間</div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { code: "R30", name: "30秒房", desc: "快速節奏、爽快下注" },
              { code: "R60", name: "60秒房", desc: "標準節奏、穩健出手" },
              { code: "R90", name: "90秒房", desc: "從容觀望、搭配路子" },
            ].map((r) => (
              <Link
                key={r.code}
                href={`/casino/baccarat/${r.code}`}
                className="glass-card p-5 hover-pop sheen"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl font-bold">{r.name}</div>
                  <div className="badge">{r.code}</div>
                </div>
                <div className="text-white/70 text-sm">{r.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
