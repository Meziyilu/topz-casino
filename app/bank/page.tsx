// app/bank/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Balances = { wallet: number; bank: number };
type LedgerItem = {
  id: string;
  createdAt: string;
  type: string;
  target: string;
  delta: number;
  amount: number | null;
  fee: number | null;
  memo: string | null;
  fromTarget: string | null;
  toTarget: string | null;
  transferGroupId: string | null;
  peerUserId: string | null;
  balanceAfter: number;
  bankAfter: number;
  meta: any;
};

export default function BankPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<Balances>({ wallet: 0, bank: 0 });
  const [amount, setAmount] = useState<number>(0);
  const [toUserId, setToUserId] = useState<string>("");
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refreshBalances() {
    const r = await fetch("/api/bank/balances", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setBalances(j.data);
  }

  async function loadLedger() {
    const r = await fetch("/api/bank/ledger?limit=20", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setLedger(j.data.items);
  }

  useEffect(() => {
    refreshBalances();
    loadLedger();
  }, []);

  async function post(url: string, body: any) {
    setLoading(true);
    try {
      const idem = crypto.randomUUID();
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem },
        body: JSON.stringify({ ...body, idempotencyKey: idem }),
      });
      const j = await r.json();
      if (!j.ok) {
        alert(j.error || "操作失敗");
      } else {
        await refreshBalances();
        await loadLedger();
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("access_token");
    }
    router.replace("/bank/login");
  }

  return (
    <div className="min-h-screen flex flex-col text-white bg-gradient-to-br from-[#0b0f1a] via-black to-[#0b0f1a]">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">🏦 銀行面板</h1>
          <div className="flex items-center gap-2">
            <a
              href="/lobby"
              className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition"
            >
              ← 返回大廳
            </a>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition"
              title="登出銀行"
            >
              登出
            </button>
          </div>
        </div>
        {/* 這裡可以插公告與跑馬燈 */}
        <div className="px-4 py-1 text-sm bg-black/40 border-t border-white/10 animate-pulse">
          📢 公告：歡迎使用銀行服務！ | 🎉 新功能即將上線！
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-6xl p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-4 shadow bg-white/5 border border-white/10">
            <div className="text-sm opacity-70">Wallet</div>
            <div className="text-2xl font-semibold">{balances.wallet} 元</div>
          </div>
          <div className="rounded-2xl p-4 shadow bg-white/5 border border-white/10">
            <div className="text-sm opacity-70">Bank</div>
            <div className="text-2xl font-semibold">{balances.bank} 元</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 shadow border border-white/10 bg-white/5 space-y-3">
            <h2 className="font-semibold">存款（錢包 → 銀行）</h2>
            <input
              className="w-full p-2 border rounded bg-black/30"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
            />
            <button
              disabled={loading}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition text-white"
              onClick={() => post("/api/bank/deposit", { amount })}
            >
              存款
            </button>
          </div>

          <div className="rounded-2xl p-4 shadow border border-white/10 bg-white/5 space-y-3">
            <h2 className="font-semibold">提款（銀行 → 錢包）</h2>
            <input
              className="w-full p-2 border rounded bg-black/30"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
            />
            <button
              disabled={loading}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 transition text-white"
              onClick={() => post("/api/bank/withdraw", { amount })}
            >
              提款
            </button>
          </div>

          <div className="rounded-2xl p-4 shadow border border-white/10 bg-white/5 space-y-3">
            <h2 className="font-semibold">P2P 轉帳（錢包 → 對方錢包）</h2>
            <input
              className="w-full p-2 border rounded bg-black/30"
              placeholder="對方 UserId"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
            />
            <input
              className="w-full p-2 border rounded bg-black/30"
              type="number"
              placeholder="金額"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
            />
            <button
              disabled={loading}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 transition text-white"
              onClick={() => post("/api/bank/transfer", { toUserId, amount, feeSide: "NONE" })}
            >
              轉帳
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-4 shadow border border-white/10 bg-white/5">
          <h2 className="font-semibold mb-3">交易明細</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="p-2">時間</th>
                  <th className="p-2">類型</th>
                  <th className="p-2">目標</th>
                  <th className="p-2">金額</th>
                  <th className="p-2">Δ</th>
                  <th className="p-2">餘額(錢包/銀行)</th>
                  <th className="p-2">對手方</th>
                  <th className="p-2">群組</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((x) => (
                  <tr key={x.id} className="border-t border-white/10">
                    <td className="p-2">{new Date(x.createdAt).toLocaleString()}</td>
                    <td className="p-2">{x.type}</td>
                    <td className="p-2">{x.target}</td>
                    <td className="p-2">{x.amount ?? "-"}</td>
                    <td className="p-2">{x.delta}</td>
                    <td className="p-2">
                      {x.balanceAfter} / {x.bankAfter}
                    </td>
                    <td className="p-2">{x.peerUserId ?? "-"}</td>
                    <td className="p-2">{x.transferGroupId?.slice(0, 8) ?? "-"}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td className="p-2" colSpan={8}>
                      尚無紀錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
