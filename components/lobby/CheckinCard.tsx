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

  function disabledReason(s: StateResp | null, load: boolean, claim: boolean): string {
    if (load) return "正在載入狀態";
    if (claim) return "領取中";
    if (!s) return "尚未取得簽到狀態（可能未登入或 API 被攔）";
    if (!s.canClaim) return "今天已領或尚未到可領時間";
    return "";
  }

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const readJsonOrThrow = async (res: Response, label: string) => {
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`[${label}] HTTP ${res.status} ${res.statusText} | CT=${ct} | Body=${body.slice(0,200)}`);
        }
        if (!ct.includes("application/json")) {
          const body = await res.text().catch(() => "");
          throw new Error(`[${label}] NON_JSON | CT=${ct} | Body=${body.slice(0,200)}`);
        }
        return res.json();
      };

      const [s, h] = await Promise.all([
        fetch("/api/checkin/state", { cache: "no-store", credentials: "include" }).then(r => readJsonOrThrow(r, "state")),
        fetch("/api/checkin/history?limit=14", { cache: "no-store", credentials: "include" }).then(r => readJsonOrThrow(r, "history")),
      ]);

      setState(s);
      setHistory(h.list ?? []);
    } catch (e: any) {
      setErr(e?.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function claim() {
    if (!state?.canClaim || claiming) return;
    setClaiming(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkin/claim", { method: "POST", credentials: "include" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const body = await res.text().catch(()=> "");
        throw new Error(`[claim] NON_JSON | CT=${ct} | Body=${body.slice(0,200)}`);
      }
      const data = await res.json();

      if (data.claimed) {
        setPlay(true);
        setTimeout(() => setPlay(false), 2500);
        await refresh();
      } else if (data.reason === "ALREADY_CLAIMED") {
        await refresh();
      } else {
        setErr("簽到失敗，請稍後再試");
      }
    } catch (e:any) {
      setErr(e?.message || "簽到失敗");
    } finally {
      setClaiming(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const nextAtStr = state ? new Date(state.nextAvailableAt).toLocaleString() : "";
  const sundayBonus = state?.previewDetail?.sundayBonus ?? 0;

  return (
    <div className="pf-checkin-card">
      {/* Lottie：使用你的實際路徑 /public/lottie/checkin-fireworks.json */}
      <div ref={lottieWrapRef} className={`pf-lottie-wrap ${play ? "playing" : ""}`} style={{height: 180}}>
        {play && (
          <LottiePlayer
            path="/lottie/checkin-fireworks.json"
            loop={false}
            autoplay={true}
            speed={1.05}
          />
        )}
      </div>
      <div className={`pf-glow ${play ? "" : "dim"}`} />

      <div className="pf-checkin-title">每日簽到（1–30天表＋週日大獎）</div>

      {err && (
        <div className="pf-badge" style={{ borderColor: "var(--pf-danger,#f87171)", whiteSpace:"pre-wrap" }}>
          {err}
        </div>
      )}

      <div className="pf-checkin-row">
        <div className="pf-badge">連續天數：<b>{state?.streak ?? 0}</b></div>
        <div className="pf-badge">累積簽到：<b>{state?.totalClaims ?? 0}</b></div>
        <div classNam
