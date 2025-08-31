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

/** 會自動帶 Authorization: Bearer <token> */
function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("access_token")
      : null;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // 除錯：在 dev console 看看現在帶的是誰、打去哪
  if (process.env.NODE_ENV !== "production") {
    // @ts-ignore
    console.debug("[authFetch]", input, { hasToken: !!token, headers: Object.fromEntries(headers.entries()) });
  }

  return fetch(input, { ...init, headers });
}

export default function BankPage() {
  // 餘額
  const [balances, setBalances] = useState<Balances>({ wallet: 0, bank: 0 });

  // ❗ 三個輸入框分開管理，互不干擾
  const [depositAmt, setDepositAmt] = useState<string>("");
  const [withdrawAmt, setWithdrawAmt] = useState<string>("");
  const [transferAmt, setTransferAmt] = useState<string>("");

  const [toUserId, setToUserId] = useState<string>("");

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [marquees, setMarquees] = useState<MarqueeMessage[]>([]);
  const [anncs, setAnncs] = useState<Announcement[]>([]);

  // 轉成正整數（空字串/NaN 會變 0）
  const toInt = (s: string) => {
    const n = parseInt(s || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const dep = useMemo(() => toInt(depositAmt), [depositAmt]);
  const wdr = useMemo(() => toInt(withdrawAmt), [withdrawAmt]);
  const trf = useMemo(() => toInt(transferAmt), [transferAmt]);

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "-";

  async function refreshBalances() {
    const r = await authFetch("/api/bank/balances", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setBalances(j.data);
  }

  async function loadLedger() {
    const r = await authFetch("/api/bank/ledger?limit=20", { cache: "no-store" });
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

  /** 包一層：統一帶冪等鍵、印出除錯資訊 */
  async function postWithIdem(url: string, payload: Record<string, any>) {
    setLoading(true);
    try {
      const idem = crypto.randomUUID();
      const body = { ...payload, idempotencyKey: idem };
      if (process.env.NODE_ENV !== "production") {
        console.debug("[POST]", url, body);
      }
      const r = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.ok) {
        // 將錯誤更友善地呈現出來
        const msg = j?.error || r.statusText || "操作失敗";
        console.error("[POST][ERROR]", url, r.status, msg, j);
        alert(`${msg} (HTTP ${r.status})`);
        return false;
      }

      await refreshBalances();
      await loadLedger();
      return true;
    } finally {
      setLoading(false);
    }
  }

  // UI：跑馬燈
  const marqueeText = useMemo(
    () => (marquees.length ? marquees.map((m) => `【公告】${m.text}`).join("　｜　") : ""),
    [marquees]
  );

  // 額外提示：沒有 token 的話，顯示一條警示
  const tokenMissing =
    typeof window !== "undefined" &&
    !localStorage.getItem("token") &&
    !localStorage.getItem("jwt") &&
    !localStorage.getItem("access_token");

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
        {/* 沒 token 的提示 */}
        {tokenMissing && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
            未偵測到登入 Token，請先登入（或確認 token 存在於 localStorage 的
            <code className="mx-1">token/jwt/access_token</code>）。
          </div>
        )}

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
          {/* 存款（錢包→銀行） */}
          <ActionCard
            title="存款"
            hint="錢包 → 銀行"
            actionLabel="存款"
            color="from-blue-500 to-indigo-600"
            disabled={loading || dep <= 0}
            amount={depositAmt}
            onAmountChange={setDepositAmt}
            onClick={async () => {
              if (dep <= 0) return alert("金額需為正整數");
              const ok = await postWithIdem("/api/bank/deposit", { amount: dep });
              if (ok) setDepositAmt("");
            }}
          />

          {/* 提款（銀行→錢包） */}
          <ActionCard
            title="提款"
            hint="銀行 → 錢包"
            actionLabel="提款"
            color="from-emerald-500 to-teal-600"
            disabled={loading || wdr <= 0}
            amount={withdrawAmt}
            onAmountChange={setWithdrawAmt}
            onClick={async () => {
              if (wdr <= 0) return alert("金額需為正整數");
              const ok = await postWithIdem("/api/bank/withdraw", { amount: wdr });
              if (ok) setWithdrawAmt("");
            }}
          />

          {/* 轉帳（錢包→對方錢包） */}
          <TransferCard
            title="轉帳"
            hint="錢包 → 對方錢包"
            color="from-purple-500 to-fuchsia-600"
            disabled={loading || trf <= 0 || !toUserId}
            amount={transferAmt}
            toUserId={toUserId}
            onToUserIdChange={setToUserId}
            onAmountChange={setTransferAmt}
            onClick={async () => {
              if (trf <= 0) return alert("金額需為正整數");
              if (!toUserId) return alert("請輸入對方 UserId");
              const ok = await postWithIdem("/api/bank/transfer", { toUserId, amount: trf, feeSide: "NONE" });
              if (ok) {
                setTransferAmt("");
                setToUserId("");
              }
            }}
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

/* 子元件 */
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
