// components/CheckinCard.tsx
"use client";

import { useEffect, useState } from "react";

type StatusResp = {
  ok: boolean;
  today: { claimed: boolean; reward: number; day: string };
  streak: number;
  balance: number;
};

export default function CheckinCard({
  onClaimed,
}: {
  onClaimed?: (nextBalance: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [stat, setStat] = useState<StatusResp | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/checkin/status", { cache: "no-store", credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "載入失敗");
      setStat(j as StatusResp);
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
    if (!stat || stat.today.claimed) return;
    setClaiming(true);
    setErr("");
    try {
      const r = await fetch("/api/checkin/claim", {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "簽到失敗");

      // 更新卡片狀態
      await load();

      // 小提示
      setToast(`簽到成功！+${j.reward} 金幣`);
      setTimeout(() => setToast(null), 2500);

      // 通知外部（大廳刷新錢包）
      if (onClaimed && typeof j.balance === "number") onClaimed(j.balance);
    } catch (e: any) {
      setErr(e?.message || "簽到失敗");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 border border-white/15 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">🎁 每日簽到</h2>
        {stat && <div className="text-xs opacity-70">連續：{stat.streak} 天</div>}
      </div>

      {loading ? (
        <div className="opacity-70 text-sm">載入中…</div>
      ) : err ? (
        <div className="text-rose-300 text-sm">{err}</div>
      ) : stat ? (
        <>
          <div className="text-sm opacity-80">
            今日：{new Date(stat.today.day).toLocaleDateString()}　
            {stat.today.claimed ? (
              <span className="text-emerald-300">已簽到 ✅</span>
            ) : (
              <span>可領獎勵 <b>{stat.today.reward}</b> 金幣</span>
            )}
          </div>

          <button
            disabled={claiming || stat.today.claimed}
            onClick={claim}
            className="mt-4 w-full rounded-xl px-4 py-3 border border-white/20 hover:border-emerald-300/60 transition 
                       bg-gradient-to-br from-emerald-400/15 to-emerald-200/5"
          >
            {stat.today.claimed ? "今天已簽到" : claiming ? "領取中…" : "立即簽到"}
          </button>

          {toast && <div className="mt-3 text-emerald-300 text-sm">{toast}</div>}
        </>
      ) : (
        <div className="opacity-70 text-sm">目前暫無資料</div>
      )}
    </div>
  );
}
