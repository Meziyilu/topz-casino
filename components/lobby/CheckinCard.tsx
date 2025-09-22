"use client";

import { useEffect, useRef, useState } from "react";
import "@/public/styles/checkin.css";
import dynamic from "next/dynamic";

const LottiePlayer = dynamic(() => import("@/components/common/LottiePlayer"), { ssr: false });

type StateResp = {
  lastClaimedYmd: string | null;
  streak: number;
  totalClaims: number;
  nextAvailableAt: string;
  canClaim: boolean;
  todayClaimed: boolean;
  amountPreview: number;
  previewDetail?: { base: number; sundayBonus: number; streakAfter: number };
};

type HistItem = {
  id: string;
  ymd: string;
  amount: number;
  streakBefore: number;
  streakAfter: number;
  createdAt: string;
};

export default function CheckinCard() {
  const [state, setState] = useState<StateResp | null>(null);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [play, setPlay] = useState(false);
  const lottieWrapRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const [s, h] = await Promise.all([
        fetch("/api/checkin/state", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/checkin/history?limit=14", { cache: "no-store" }).then(r => r.json()),
      ]);
      setState(s);
      setHistory(h.list ?? []);
    } catch {
      setErr("載入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function claim() {
    if (!state?.canClaim) return;
    setClaiming(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkin/claim", { method: "POST" });
      const data = await res.json();
      if (data.claimed) {
        setPlay(true); // 播 Lottie
        setTimeout(() => setPlay(false), 2500);
        await refresh();
      } else if (data.reason === "ALREADY_CLAIMED") {
        await refresh();
      } else {
        setErr("簽到失敗，請稍後再試");
      }
    } catch {
      setErr("簽到失敗");
    } finally {
      setClaiming(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const nextAtStr = state ? new Date(state.nextAvailableAt).toLocaleString() : "";
  const sundayBonus = state?.previewDetail?.sundayBonus ?? 0;

  return (
    <div className="pf-checkin-card">
      {/* Lottie on top */}
      <div ref={lottieWrapRef} className={`pf-lottie-wrap ${play ? "playing" : ""}`}>
        {play && (
          <LottiePlayer
            path="/lottie/checkin-fireworks.json"
            loop={false}
            autoplay={true}
            speed={1.1}
          />
        )}
      </div>
      <div className={`pf-glow ${play ? "" : "dim"}`} />

      <div className="pf-checkin-title">
        每日簽到（1–30天表＋週日大獎）
      </div>

      {err && <div className="pf-badge" style={{ borderColor: "var(--pf-danger,#f87171)" }}>{err}</div>}

      <div className="pf-checkin-row">
        <div className="pf-badge">連續天數：<b>{state?.streak ?? 0}</b></div>
        <div className="pf-badge">累積簽到：<b>{state?.totalClaims ?? 0}</b></div>
        <div className="pf-badge">今日預覽：<b>{state?.amountPreview ?? 0}</b></div>
        {sundayBonus > 0 && <div className="pf-badge">含週日加碼：+{sundayBonus}</div>}
        <button
          className="pf-cta"
          onClick={claim}
          disabled={loading || claiming || !state?.canClaim}
          title={state?.canClaim ? "領取今日簽到獎勵" : "下一次可領：" + nextAtStr}
        >
          {claiming ? "領取中…" : state?.todayClaimed ? "今天已領" : "領取獎勵"}
        </button>
      </div>

      {!state?.canClaim && <div className="pf-muted">下一次可領時間：{nextAtStr}</div>}

      <ul className="pf-list">
        {history.map((it) => (
          <li key={it.id}>
            <span>{new Date(it.ymd).toLocaleDateString()}</span>
            <span>+{it.amount}（{it.streakAfter} 天）</span>
          </li>
        ))}
        {history.length === 0 && <li><span className="pf-muted">尚無歷史紀錄</span><span /></li>}
      </ul>
    </div>
  );
}
