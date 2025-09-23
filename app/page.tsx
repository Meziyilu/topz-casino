// app/page.tsx
"use client";

// ✅ 一次載入大廳樣式 + 頭框特效樣式 + 本次補充樣式
import "@/public/styles/lobby.css";
import "@/public/styles/headframes.css";
import "@/public/styles/lobby-extras.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import Clock from "@/components/lobby/Clock";
import ThemeToggle from "@/components/lobby/ThemeToggle";
import ProfileCard from "@/components/lobby/ProfileCard";
import GameCard from "@/components/lobby/GameCard";
import ChatBox from "@/components/lobby/ChatBox";
import ServiceWidget from "@/components/lobby/ServiceWidget";
import Leaderboard from "@/components/lobby/Leaderboard";
import CheckinCard from "@/components/lobby/CheckinCard";
import BankLottie from "@/components/bank/BankLottie";
import AnnouncementTicker from "@/components/lobby/AnnouncementTicker";
import AnnouncementModal from "@/components/lobby/AnnouncementModal";

// ⬇ 四個 Lottie（json 放在 /public/lottie/）
import RouletteLottie from "@/components/roulette/RouletteLottie";
import BaccaratLottie from "@/components/baccarat/BaccaratLottie";
import SicboLottie from "@/components/sicbo/SicboLottie";
import LottoLottie from "@/components/lotto/LottoLottie";

type Me = {
  id: string;
  displayName: string;
  balance: number;
  bankBalance: number;
  vipTier: number;
  avatarUrl?: string | null;
  headframe?: string | null;
  panelTint?: string | null;
};

type LbItem = {
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  vipTier: number;
  netProfit: number;
  headframe?: string | null;
  panelTint?: string | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  createdAt?: string;
};

// 大廳輪盤卡片概覽
type RouletteOverview = {
  phase: "BETTING" | "REVEALING" | "SETTLED";
  msLeft: number;
  online?: number;
};

export default function LobbyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [marquee, setMarquee] = useState<string[]>([]);
  const [weeklyLB, setWeeklyLB] = useState<LbItem[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);

  // ✅ 輪盤卡片（以 RL_R60 為大廳顯示房）
  const [rlCountdown, setRlCountdown] = useState<number>(0);
  const [rlOnline, setRlOnline] = useState<number>(0);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // ✅ 跑馬燈：對齊 /api/marquee/active → { items: [{id,text,...}] }
  useEffect(() => {
    fetch("/api/marquee/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMarquee((d.items ?? []).map((m: { text: string }) => m.text)))
      .catch(() => setMarquee([]));
  }, []);

  // ✅ 公告：對齊 /api/announcements/active → { items: [...] }
  useEffect(() => {
    fetch("/api/announcements/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAnns(d.items ?? []))
      .catch(() => setAnns([]));
  }, []);

  useEffect(() => {
    fetch("/api/leaderboard?period=WEEKLY&limit=10", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setWeeklyLB(d.items ?? []))
      .catch(() => setWeeklyLB([]));
  }, []);

  // ✅ 讀 RL_R60 狀態：每 5s 同步一次，平時每秒本地倒數
  useEffect(() => {
    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const loadRoulette = async () => {
      try {
        const r = await fetch("/api/casino/roulette/overview?room=RL_R60", { cache: "no-store" });
        if (!r.ok) throw new Error("bad");
        const d: RouletteOverview | { ms_left?: number; online?: number } = await r.json();
        const ms =
          typeof (d as RouletteOverview).msLeft === "number"
            ? (d as RouletteOverview).msLeft
            : typeof (d as any).ms_left === "number"
            ? (d as any).ms_left
            : 0;
        setRlCountdown(Math.max(0, Math.ceil(ms / 1000)));
        setRlOnline((d as any).online ?? 0);
      } catch {
        // 失敗時避免 UI 空白
        setRlCountdown((s) => (s > 0 ? s : 30));
      }
    };

    loadRoulette();
    tickTimer = setInterval(() => setRlCountdown((s) => (s > 0 ? s - 1 : 0)), 1000);
    pollTimer = setInterval(loadRoulette, 5000);

    return () => {
      if (tickTimer) clearInterval(tickTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    window.location.href = "/login";
  }

  return (
    <main className="lb-wrap">
      <div className="lb-bg" />
      <div className="lb-particles" aria-hidden />

      {/* ⬆️ 全域公告彈窗（依 localStorage 判斷是否顯示） */}
      <AnnouncementModal />

      {/* Header */}
      <header className="lb-header">
        <div className="left">
          <div className="lb-logo">TOPZCASINO</div>
          <span className="lb-beta">LOBBY</span>
        </div>

        <div className="center">
          <AnnouncementTicker
            items={
              marquee.length
                ? marquee
                : ["🎉 新手禮包開放領取！", "🔥 百家樂 R60 房間將於 21:00 開新局", "💎 連續簽到 7 天可抽稀有徽章"]
            }
          />
        </div>

        <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Clock />
          <ThemeToggle />
          <Link href="/profile" className="lb-user-mini">
            <span className="name">{me?.displayName ?? "玩家"}</span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="lb-btn"
            disabled={loggingOut}
            aria-label="登出"
            title="登出"
            style={{ padding: "8px 12px" }}
          >
            {loggingOut ? "登出中…" : "登出"}
          </button>
        </div>
      </header>

      {/* 主板塊 */}
      <div className="lb-grid">
        {/* 左欄 */}
        <aside className="lb-col">
          <ProfileCard
            displayName={me?.displayName ?? "玩家"}
            avatarUrl={me?.avatarUrl ?? undefined}
            vipTier={me?.vipTier ?? 0}
            wallet={me?.balance ?? 0}
            bank={me?.bankBalance ?? 0}
            headframe={me?.headframe ?? undefined}
            panelTint={me?.panelTint ?? undefined}
          />

          <CheckinCard />

          {/* 銀行卡片 */}
          <div className="lb-bank" aria-label="銀行">
            <div className="lb-bank__head">
              <div className="lb-bank__titlewrap">
                <BankLottie />
                <div className="lb-bank__title">銀行</div>
              </div>
              <Link href="/bank" className="lb-btn-mini ghost">前往銀行</Link>
            </div>
            <div className="lb-bank__rows">
              <div className="lb-bank__row">
                <div className="lb-bank__k">錢包餘額</div>
                <div className="lb-bank__v">{(me?.balance ?? 0).toLocaleString()}</div>
              </div>
              <div className="lb-bank__row">
                <div className="lb-bank__k">銀行餘額</div>
                <div className="lb-bank__v">{(me?.bankBalance ?? 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="lb-bank__actions">
              <Link href="/bank?tab=deposit" className="lb-btn-mini">存入銀行</Link>
              <Link href="/bank?tab=withdraw" className="lb-btn-mini ghost">提領至錢包</Link>
            </div>
          </div>

          {/* 公告卡片 */}
          <div className="lb-card">
            <div className="lb-card-title">公告</div>
            <ul className="lb-list soft" id="ann-list">
              {anns.length ? (
                anns.map((a) => (
                  <li key={a.id} className="ann-item">
                    <div className="ann-title">{a.title}</div>
                    <div className="ann-body">{a.body}</div>
                  </li>
                ))
              ) : (
                <li className="lb-muted">目前沒有公告</li>
              )}
            </ul>
          </div>

          <Leaderboard title="排行榜（週）" items={weeklyLB} />
        </aside>

        {/* 中欄 */}
        <section className="lb-main">
          <div className="lb-games">
            {/* 輪盤（右側 Lottie） */}
            <GameCard title="輪盤" online={rlOnline} countdown={rlCountdown} href="/casino/roulette">
              <div className="gc-overlay gc-right">
                <RouletteLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            {/* 百家樂 */}
            <GameCard title="百家樂" online={328} countdown={27} href="/casino/baccarat">
              <div className="gc-overlay gc-right">
                <BaccaratLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            {/* 骰寶 */}
            <GameCard title="骰寶" online={152} countdown={41} href="/casino/sicbo">
              <div className="gc-overlay gc-right">
                <SicboLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            {/* 樂透 */}
            <GameCard title="樂透" online={93} href="/casino/lotto">
              <div className="gc-overlay gc-right">
                <LottoLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            {/* 21點暫未開放 */}
            <GameCard title="21點" online={0} disabled href="/casino/blackjack" />
          </div>

          <ChatBox room="LOBBY" />
        </section>

        {/* 右欄 */}
        <aside className="lb-col right-col">
          <div className="lb-card tall center">
            <div className="lb-card-title">客服中心</div>
            <p className="lb-muted">任何問題？點擊右下角小幫手</p>
          </div>
        </aside>
      </div>

      <ServiceWidget />

      {/* ⬇ 把 Lottie 改到卡片「右側置中」 */}
      <style jsx global>{`
        .game-card { position: relative; overflow: hidden; }
        .game-card .gc-overlay.gc-right {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,.35));
        }
        @media (max-width: 640px) {
          .game-card .gc-overlay.gc-right { right: 4px; transform: translateY(-50%) scale(.9); }
        }
      `}</style>
    </main>
  );
}
