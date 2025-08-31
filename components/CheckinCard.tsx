// components/CheckinCard.tsx
"use client";

import { useEffect, useState } from "react";

type StatusResp = {
  user: { id: string; name?: string | null; email: string; balance: number };
  today: string;
  claimedToday: boolean;
  nextStreak: number;
  todayReward: number;
  recent: { day: string; reward: number; streak: number; createdAt: string }[];
};

export default function CheckinCard({
  onBalanceUpdate,
}: {
  onBalanceUpdate?: (balance: number) => void;
}) {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/checkin/status", { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "載入失敗");
      setStatus(j);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "連線失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function claim() {
    setClaiming(true);
    try {
      const r = await fetch("/api/checkin/claim", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "簽到失敗");
      // 重新載入狀態
      await load();

      // 拉一次 /api/auth/me 更新錢包（如果你有此 API）
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const meJson = await meRes.json();
        if (meRes.ok && onBalanceUpdate) onBalanceUpdate(meJson?.user?.balance ?? undefined);
      } catch {}
    } catch (e: any) {
      setErr(e?.message || "簽到失敗");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-bold">每日簽到</div>
        <div className="opacity-70 text-sm">{status ? new Date(status.today).toLocaleDateString("zh-TW") : ""}</div>
      </div>

      {err && <div className="text-red-400 text-sm mb-2">{err}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 border border-white/10">
          <div className="text-sm opacity-70">今日獎勵</div>
          <div className="text-2xl font-extrabold mt-1">{status?.todayReward ?? "--"} 金幣</div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/10">
          <div className="text-sm opacity-70">連續天數</div>
          <div className="text-2xl font-extrabold mt-1">{status?.nextStreak ?? "--"} 天</div>
        </div>
      </div>

      <button
        disabled={loading || claiming || !!status?.claimedToday}
        onClick={claim}
        className={`mt-4 w-full py-3 rounded-xl font-bold transition ${
          status?.claimedToday
            ? "bg-white/10 text-white/60 cursor-not-allowed"
            : "bg-gradient-to-br from-cyan-400/20 to-fuchsia-400/20 border border-white/20 hover:border-white/40"
        }`}
      >
        {status?.claimedToday ? "今天已簽到 ✔" : claiming ? "簽到中…" : "領取今日獎勵"}
      </button>

      <div className="mt-4">
        <div className="text-sm opacity-70 mb-2">近 7 天</div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, idx) => {
            const item = status?.recent?.[idx];
            const isDone = !!item;
            return (
              <div
                key={idx}
                className={`rounded-lg p-2 text-center border ${
                  isDone ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/5"
                }`}
                title={isDone ? `第 ${item.streak} 天 +${item.reward}` : "未簽到"}
              >
                <div className="text-xs">{isDone ? `第${item.streak}天` : "—"}</div>
                <div className="text-[11px] opacity-80">{isDone ? `+${item.reward}` : ""}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
