// app/bank/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type MarqueeMessage = { id: string; text: string; priority: number; enabled: boolean };
type Announcement = { id: string; title: string; content: string; enabled: boolean };

export default function BankPage() {
  const [balances, setBalances] = useState<Balances>({ wallet: 0, bank: 0 });
  const [amount, setAmount] = useState<string>("");
  const [toUserId, setToUserId] = useState<string>("");
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [marquees, setMarquees] = useState<MarqueeMessage[]>([]);
  const [anncs, setAnncs] = useState<Announcement[]>([]);

  const intAmount = useMemo(() => {
    const n = parseInt(amount || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "-";

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

  async function loadMarquee() {
    try {
      const r = await fetch("/api/marquee?enabled=1", { cache: "no-store" });
      const j = await r.json();
      const items = Array.isArray(j?.data) ? j.data : [];
      setMarquees(items.filter((x: any) => x.enabled !== false));
    } catch {}
  }

  async function loadAnnouncements() {
    try {
      const r = await fetch("/api/announcements?enabled=1", { cache: "no-store" });
      const j = await r.json();
      const items = Array.isArray(j?.data) ? j.data : [];
      setAnncs(items.filter((x: any) => x.enabled !== false));
    } catch {}
  }

  useEffect(() => {
    refreshBalances();
    loadLedger();
    loadMarquee();
    loadAnnouncements();
  }, []);

  async function post(url: string, body: any) {
    if (!intAmount && url.includes("bank")) {
      alert("金額需為正整數");
      return;
    }
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
        setAmount("");
        setToUserId("");
      }
    } finally {
      setLoading(false);
    }
  }

  const marqueeText = useMemo(
    () => (marquees.length ? marquees.map((m) => `【公告】${m.text}`).join("　｜　") : ""),
    [marquees]
  );

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-gray-950 via-black to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">🏦 銀行面板</h1>
          <Link
            href="/lobby"
            className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition"
          >
            ← 返回大廳
          </Link>
        </div>
        {marqueeText && (
          <div className="w-full overflow-hidden border-t border-white/10 bg-white/10 backdrop-blur-sm">
            <div className="relative h-8 flex items-center">
              <div className="marquee whitespace-nowrap text-sm px-4">{marqueeText}</div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* 公告 */}
        {anncs.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4 space-y-2">
            <h2 className="font-semibold">📢 公告</h2>
            {anncs.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-white/10 bg-white/5">
                <div className="font-medium">{a.title}</div>
                <p className="text-sm opacity-80">{a.content}</p>
              </div>
            ))}
          </section>
        )}

        {/* 餘額 */}
        <section className="grid grid-cols-2 gap-4">
          <InfoCard label="Wallet" value={`${fmt(balances.wallet)} 元`} />
          <InfoCard label="Bank" value={`${fmt(balances.bank)} 元`} />
        </section>

        {/* 操作 */}
        <section className="grid md:grid-cols-3 gap-4">
          <ActionCard
            title="存款"
            hint="錢包 → 銀行"
            actionLabel="存款"
            color="from-blue-500 to-indigo-600"
            disabled={loading || intAmount <= 0}
            amount={amount}
            onAmountChange={setAmount}
            onClick={() => post("/api/bank/deposit", { amount: intAmount })}
          />
          <ActionCard
            title="提款"
            hint="銀行 → 錢包"
            actionLabel="提款"
            color="from-emerald-500 to-teal-600"
            disabled={loading || intAmount <= 0}
            amount={amount}
            onAmountChange={setAmount}
            onClick={() => post("/api/bank/withdraw", { amount: intAmount })}
          />
          <TransferCard
            title="轉帳"
            hint="錢包 → 對方錢包"
            color="from-purple-500 to-fuchsia-600"
            disabled={loading || intAmount <= 0 || !toUserId}
            amount={amount}
            toUserId={toUserId}
            onToUserIdChange={setToUserId}
            onAmountChange={setAmount}
            onClick={() => post("/api/bank/transfer", { toUserId, amount: intAmount })}
          />
        </section>

        {/* 明細 */}
        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4">
          <h2 className="font-semibold mb-3">📄 交易明細</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="p-2">時間</th>
                  <th className="p-2">類型</th>
                  <th className="p-2">目標</th>
                  <th className="p-2">金額</th>
                  <th className="p-2">Δ</th>
                  <th className="p-2">餘額</th>
                  <th className="p-2">對手</th>
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
                    <td className={`p-2 ${x.delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{x.delta}</td>
                    <td className="p-2">{x.balanceAfter}/{x.bankAfter}</td>
                    <td className="p-2">{x.peerUserId ?? "-"}</td>
                    <td className="p-2">{x.transferGroupId?.slice(0, 8) ?? "-"}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td className="p-2" colSpan={8}>尚無紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <style jsx>{`
        .marquee {
          display: inline-block;
          animation: marquee 25s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 border border-white/10 bg-white/10 backdrop-blur-md">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ActionCard(props: {
  title: string; hint?: string; actionLabel: string;
  color: string; disabled?: boolean; amount: string;
  onAmountChange: (v: string) => void; onClick: () => void;
}) {
  return (
    <div className="rounded-2xl p-4 border border-white/10 bg-white/10 backdrop-blur-md space-y-3">
      <h3 className="font-semibold">{props.title}</h3>
      {props.hint && <p className="text-xs opacity-70">{props.hint}</p>}
      <input
        className="w-full p-2 border border-white/10 rounded-lg bg-white/5"
        type="number"
        placeholder="金額"
        value={props.amount}
        onChange={(e) => props.onAmountChange(e.target.value)}
      />
      <button
        disabled={props.disabled}
        className={`px-4 py-2 rounded-xl text-white shadow disabled:opacity-50 bg-gradient-to-r ${props.color}`}
        onClick={props.onClick}
      >
        {props.actionLabel}
      </button>
    </div>
  );
}

function TransferCard(props: {
  title: string; hint?: string; color: string; disabled?: boolean;
  toUserId: string; amount: string;
  onToUserIdChange: (v: string) => void; onAmountChange: (v: string) => void;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl p-4 border border-white/10 bg-white/10 backdrop-blur-md space-y-3">
      <h3 className="font-semibold">{props.title}</h3>
      {props.hint && <p className="text-xs opacity-70">{props.hint}</p>}
      <input
        className="w-full p-2 border border-white/10 rounded-lg bg-white/5"
        placeholder="對方 UserId"
        value={props.toUserId}
        onChange={(e) => props.onToUserIdChange(e.target.value)}
      />
      <input
        className="w-full p-2 border border-white/10 rounded-lg bg-white/5"
        type="number"
        placeholder="金額"
        value={props.amount}
        onChange={(e) => props.onAmountChange(e.target.value)}
      />
      <button
        disabled={props.disabled}
        className={`px-4 py-2 rounded-xl text-white shadow disabled:opacity-50 bg-gradient-to-r ${props.color}`}
        onClick={props.onClick}
      >
        轉帳
      </button>
    </div>
  );
}
