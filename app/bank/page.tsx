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
type Announcement = {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
};

export default function BankPage() {
  // ---------- state ----------
  const [balances, setBalances] = useState<Balances>({ wallet: 0, bank: 0 });
  const [amount, setAmount] = useState<string>(""); // 以字串綁定輸入，避免 NaN 抖動
  const [toUserId, setToUserId] = useState<string>("");

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [marquees, setMarquees] = useState<MarqueeMessage[]>([]);
  const [anncs, setAnncs] = useState<Announcement[]>([]);

  // ---------- helpers ----------
  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "-";

  const intAmount = useMemo(() => {
    const n = parseInt(amount || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  // ---------- data loaders ----------
  async function refreshBalances() {
    try {
      const r = await fetch("/api/bank/balances", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setBalances(j.data);
    } catch {}
  }

  async function loadLedger() {
    try {
      const r = await fetch("/api/bank/ledger?limit=20", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setLedger(j.data.items);
    } catch {}
  }

  async function loadMarquee() {
    // 預期你的 API：GET /api/marquee?enabled=1  →  [{id,text,priority,enabled},...]
    try {
      const r = await fetch("/api/marquee?enabled=1", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      // 兼容可能的資料格式
      const items = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setMarquees(items.filter((x: any) => x.enabled !== false).sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0)));
    } catch {}
  }

  async function loadAnnouncements() {
    // 預期你的 API：GET /api/announcements?enabled=1  →  [{id,title,content,...},...]
    try {
      const r = await fetch("/api/announcements?enabled=1", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const items = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
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
    if (!intAmount && (url.includes("deposit") || url.includes("withdraw") || url.includes("transfer"))) {
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
        if (url.includes("transfer")) {
          setToUserId("");
        }
        setAmount("");
      }
    } finally {
      setLoading(false);
    }
  }

  // 把多條跑馬燈訊息拼成長字串（空則不顯示）
  const marqueeText = useMemo(
    () =>
      marquees.length
        ? marquees.map((m) => `【公告】${m.text}`).join("　｜　")
        : "",
    [marquees]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-20%,rgba(59,130,246,0.15),transparent)]">
      {/* 頂部：標題區 + 返回大廳 */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/50 dark:bg-black/30 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-inner" />
            <div>
              <div className="text-lg font-bold">銀行面板 Bank</div>
              <div className="text-xs opacity-70">錢包 ↔ 銀行、P2P 轉帳、交易明細</div>
            </div>
          </div>
          <Link
            href="/lobby"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/70 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 transition"
          >
            <span className="i-lucide-arrow-left" />
            返回大廳
          </Link>
        </div>

        {/* 跑馬燈 */}
        {marqueeText && (
          <div className="w-full overflow-hidden border-t bg-amber-50/80 dark:bg-amber-950/30">
            <div className="relative h-9">
              <div className="absolute inset-0 flex items-center">
                <div className="px-3 text-amber-700 dark:text-amber-300 text-sm font-medium">最新訊息</div>
                <div className="relative flex-1 overflow-hidden">
                  <div className="whitespace-nowrap will-change-transform marquee">
                    {marqueeText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 主要內容 */}
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* 公告卡片（若有） */}
        {anncs.length > 0 && (
          <section className="rounded-2xl border shadow-sm bg-white/70 dark:bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-semibold">公告 Announcement</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {anncs.slice(0, 4).map((a) => (
                <article key={a.id} className="rounded-xl border p-3 bg-white/80 dark:bg-white/5">
                  <div className="font-medium">{a.title}</div>
                  <p className="text-sm opacity-80 mt-1 leading-relaxed">{a.content}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 餘額卡片 */}
        <section className="grid grid-cols-2 gap-4">
          <InfoCard label="Wallet" value={`${fmt(balances.wallet)} 元`} />
          <InfoCard label="Bank" value={`${fmt(balances.bank)} 元`} />
        </section>

        {/* 操作卡片 */}
        <section className="grid md:grid-cols-3 gap-4">
          <ActionCard
            title="存款（錢包 → 銀行）"
            hint="將錢包資金轉入銀行"
            actionLabel="存款"
            colorClass="from-blue-500 to-indigo-600"
            disabled={loading || intAmount <= 0}
            amount={amount}
            onAmountChange={setAmount}
            onClick={() => post("/api/bank/deposit", { amount: intAmount })}
          />

          <ActionCard
            title="提款（銀行 → 錢包）"
            hint="將銀行資金轉回錢包"
            actionLabel="提款"
            colorClass="from-emerald-500 to-teal-600"
            disabled={loading || intAmount <= 0}
            amount={amount}
            onAmountChange={setAmount}
            onClick={() => post("/api/bank/withdraw", { amount: intAmount })}
          />

          <TransferCard
            title="P2P 轉帳（錢包 → 對方錢包）"
            hint="輸入對方 UserId 與金額"
            colorClass="from-purple-500 to-fuchsia-600"
            disabled={loading || intAmount <= 0 || !toUserId}
            amount={amount}
            toUserId={toUserId}
            onAmountChange={setAmount}
            onToUserIdChange={setToUserId}
            onClick={() => post("/api/bank/transfer", { toUserId, amount: intAmount, feeSide: "NONE" })}
          />
        </section>

        {/* 交易明細 */}
        <section className="rounded-2xl p-4 shadow-sm border bg-white/70 dark:bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">交易明細</h2>
            <button
              className="px-3 py-2 rounded-lg border hover:bg-white/80 dark:hover:bg-white/10 text-sm"
              onClick={loadLedger}
              disabled={loading}
            >
              重新整理
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <Th>時間</Th>
                  <Th>類型</Th>
                  <Th>目標</Th>
                  <Th>金額</Th>
                  <Th>Δ</Th>
                  <Th>餘額(錢包/銀行)</Th>
                  <Th>對手方</Th>
                  <Th>群組</Th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((x) => (
                  <tr key={x.id} className="border-t">
                    <Td>{new Date(x.createdAt).toLocaleString()}</Td>
                    <Td>{x.type}</Td>
                    <Td>{x.target}</Td>
                    <Td>{x.amount ?? "-"}</Td>
                    <Td className={x.delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {x.delta}
                    </Td>
                    <Td>
                      {x.balanceAfter} / {x.bankAfter}
                    </Td>
                    <Td>{x.peerUserId ?? "-"}</Td>
                    <Td>{x.transferGroupId?.slice(0, 8) ?? "-"}</Td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <Td colSpan={8}>尚無紀錄</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* 本頁面專用的 marquee 動畫樣式（不影響全站） */}
      <style jsx>{`
        .marquee {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 25s linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}

/* ----------------------- 子元件 ----------------------- */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm bg-white/70 dark:bg-white/5 border">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-semibold tracking-wide">{value}</div>
    </div>
  );
}

function ActionCard(props: {
  title: string;
  hint?: string;
  actionLabel: string;
  colorClass: string; // gradient
  disabled?: boolean;
  amount: string;
  onAmountChange: (v: string) => void;
  onClick: () => void;
}) {
  const { title, hint, actionLabel, colorClass, disabled, amount, onAmountChange, onClick } = props;
  return (
    <div className="rounded-2xl p-4 shadow-sm border bg-white/70 dark:bg-white/5 space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {hint && <p className="text-xs opacity-70">{hint}</p>}
      <input
        className="w-full p-2 border rounded-lg bg-white/80 dark:bg-white/5"
        type="number"
        placeholder="金額（正整數）"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        min={1}
        inputMode="numeric"
      />
      <button
        disabled={disabled}
        className={`px-4 py-2 rounded-xl text-white shadow transition disabled:opacity-50 bg-gradient-to-r ${colorClass}`}
        onClick={onClick}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function TransferCard(props: {
  title: string;
  hint?: string;
  colorClass: string;
  disabled?: boolean;
  toUserId: string;
  amount: string;
  onToUserIdChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onClick: () => void;
}) {
  const { title, hint, colorClass, disabled, toUserId, amount, onToUserIdChange, onAmountChange, onClick } = props;
  return (
    <div className="rounded-2xl p-4 shadow-sm border bg-white/70 dark:bg-white/5 space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {hint && <p className="text-xs opacity-70">{hint}</p>}

      <input
        className="w-full p-2 border rounded-lg bg-white/80 dark:bg-white/5"
        placeholder="對方 UserId"
        value={toUserId}
        onChange={(e) => onToUserIdChange(e.target.value)}
      />
      <input
        className="w-full p-2 border rounded-lg bg-white/80 dark:bg-white/5"
        type="number"
        placeholder="金額（正整數）"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        min={1}
        inputMode="numeric"
      />

      <button
        disabled={disabled}
        className={`px-4 py-2 rounded-xl text-white shadow transition disabled:opacity-50 bg-gradient-to-r ${colorClass}`}
        onClick={onClick}
      >
        轉帳
      </button>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-2 text-xs uppercase tracking-wider opacity-70">{children}</th>;
}

function Td({
  children,
  colSpan,
  className,
}: {
  children: React.ReactNode;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td colSpan={colSpan} className={`p-2 align-middle ${className || ""}`}>
      {children}
    </td>
  );
}
