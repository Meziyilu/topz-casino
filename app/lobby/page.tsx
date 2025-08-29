// app/lobby/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { id: string; email: string; isAdmin: boolean } | null;

export default function LobbyPage() {
  const [me, setMe] = useState<Me>(null);
  const [wallet, setWallet] = useState({ balance: 0, bankBalance: 0 });
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refreshMe() {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    const d = await r.json();
    setMe(d.user || null);
  }
  async function refreshWallet() {
    const r = await fetch("/api/wallet", { cache: "no-store" });
    const d = await r.json();
    if (r.ok) setWallet(d);
  }

  useEffect(() => {
    refreshMe();
    refreshWallet();
  }, []);

  async function doTransfer(action: "deposit" | "withdraw") {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action, amount }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "操作失敗");
      setWallet({ balance: d.balance, bankBalance: d.bankBalance });
      setMsg(action === "deposit" ? "銀行 → 錢包 成功" : "錢包 → 銀行 成功");
    } catch (e: any) {
      setMsg(e.message || "操作失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0b0f1a] via-[#0a0a0f] to-black text-white">
      {/* 頂部 */}
      <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="text-xl font-bold tracking-wider">
          <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            TOPZCASINO
          </span>
          <span className="ml-2 text-white/60 text-sm">大廳</span>
        </div>
        <div className="text-sm text-white/70">
          {me ? (
            <span>{me.email}{me.isAdmin && <span className="ml-2 rounded bg-amber-400/20 px-2 py-0.5 text-amber-300">Admin</span>}</span>
          ) : (
            <Link className="underline" href="/login">登入</Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-3 gap-6">
        {/* 錢包卡片 */}
        <section className="lg:col-span-1 rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold">錢包</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">錢包餘額</div>
              <div className="mt-1 text-2xl font-bold">{wallet.balance.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">銀行餘額</div>
              <div className="mt-1 text-2xl font-bold">{wallet.bankBalance.toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-white/70">轉帳金額</label>
            <input
              type="number"
              value={amount}
              min={1}
              onChange={(e) => setAmount(parseInt(e.currentTarget.value || "0", 10))}
              className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>

          <div className="mt-3 flex gap-3">
            <button
              disabled={busy}
              onClick={() => doTransfer("deposit")}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-2 text-black font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-60 transition"
            >
              銀行 → 錢包
            </button>
            <button
              disabled={busy}
              onClick={() => doTransfer("withdraw")}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 py-2 text-black font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-60 transition"
            >
              錢包 → 銀行
            </button>
          </div>

          {msg && <div className="mt-3 text-sm text-cyan-300">{msg}</div>}

          {me?.isAdmin && (
            <div className="mt-6">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 hover:bg-white/10 transition"
              >
                管理面板 →
              </Link>
            </div>
          )}
        </section>

        {/* 房間卡片 */}
        <section className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { code: "R30", name: "30秒房" },
            { code: "R60", name: "60秒房" },
            { code: "R90", name: "90秒房" },
          ].map((r) => (
            <div
              key={r.code}
              className="relative rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow-2xl overflow-hidden"
            >
              {/* 流光 */}
              <div className="pointer-events-none absolute -inset-16 bg-gradient-to-tr from-fuchsia-500/10 via-cyan-400/10 to-amber-400/10 blur-2xl" />
              <div className="relative">
                <div className="text-sm text-white/60">房間</div>
                <div className="text-2xl font-bold tracking-wide">{r.name}</div>
                <div className="mt-6">
                  <Link
                    href={`/casino/${r.code}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 to-cyan-400 px-5 py-2 text-black font-semibold hover:opacity-90 active:opacity-80 transition"
                  >
                    進入 {r.code} →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
