"use client";

// ✅ 全域樣式
import "@/public/styles/lobby.css";
import "@/public/styles/headframes.css";
import "@/public/styles/lobby-extras.css";
import "@/public/styles/popup.css";
// ✅ 新增：背包 Dock 專用樣式
import "@/public/styles/inventory-dock.css";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import SocialEntrances from "@/components/social/SocialEntrances";

// ⭐ 新增：背包 Dock
import InventoryDock, { type InventorySummary } from "@/components/lobby/InventoryDock";

// ⛑️ 會碰 window/localStorage → 動態載入並停用 SSR
const AnnouncementTicker = dynamic(() => import("@/components/lobby/AnnouncementTicker"), { ssr: false });
const AnnouncementModal  = dynamic(() => import("@/components/lobby/AnnouncementModal"),  { ssr: false });
const LobbyPopupModal    = dynamic(() => import("@/components/lobby/LobbyPopupModal"),    { ssr: false });

// ⬇ Lottie
import RouletteLottie from "@/components/roulette/RouletteLottie";
import BaccaratLottie from "@/components/baccarat/BaccaratLottie";
import SicboLottie    from "@/components/sicbo/SicboLottie";
import LottoLottie    from "@/components/lotto/LottoLottie";

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

type RouletteOverview = {
  phase: "BETTING" | "REVEALING" | "SETTLED";
  msLeft: number;
  online?: number;
};

export default function LobbyPage() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [weeklyLB, setWeeklyLB] = useState<LbItem[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);

  const [rlCountdown, setRlCountdown] = useState<number>(0);
  const [rlOnline, setRlOnline] = useState<number>(0);

  // ⭐ 新增：背包摘要（給 InventoryDock）
  const [invSum, setInvSum] = useState<InventorySummary | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // 公告卡片（列表）
  useEffect(() => {
    fetch("/api/announcements/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAnns(d.items ?? []))
      .catch(() => setAnns([]));
  }, []);

  // 排行榜
  useEffect(() => {
    fetch("/api/leaderboard?period=WEEKLY&limit=10", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setWeeklyLB(d.items ?? []))
      .catch(() => setWeeklyLB([]));
  }, []);

  // RL_R60 狀態輪詢 + 倒數
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

  // ⭐ 背包摘要：進大廳就抓一次，之後靠背包頁操作
  useEffect(() => {
    fetch("/api/inventory/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setInvSum(d.data ?? null))
      .catch(() => setInvSum(null));
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

      {/* ⬆️ 公告彈窗（僅瀏覽器端；每次進頁面都跳） */}
      {mounted && (
        <>
          <AnnouncementModal
            autoOpen
            showLatestOnly
            storageScope="local"
            storageKeyPrefix="topz"
            refetchMs={300000}
            okText="知道了"
          />
          <LobbyPopupModal
            autoOpen
            storageKeyPrefix="topz"
            remindAfterMinutes={null}
            useExternalStyle
            variant="glass"
            animation="slide-up"
            className="popup--center"
          />
        </>
      )}

      {/* ===== Header（兩列）===== */}
      <header className="lb-header">
        <div className="lb-header-top">
          <div className="left">
            <div className="lb-logo">TOPZCASINO</div>
            <span className="lb-beta">大廳</span>
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
        </div>

        <div className="lb-header-marquee">
          {mounted ? <AnnouncementTicker /> : <div style={{ height: 24 }} />}
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

          {/* ✅ 背包 Dock（快速檢視/捷徑） */}
          <InventoryDock data={invSum} />

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
            <GameCard title="輪盤" online={rlOnline} countdown={rlCountdown} href="/casino/roulette">
              <div className="gc-overlay gc-right">
                <RouletteLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            <GameCard title="百家樂" online={328} countdown={27} href="/casino/baccarat">
              <div className="gc-overlay gc-right">
                <BaccaratLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            <GameCard title="骰寶" online={152} countdown={41} href="/casino/sicbo">
              <div className="gc-overlay gc-right">
                <SicboLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            <GameCard title="樂透" online={93} href="/casino/lotto">
              <div className="gc-overlay gc-right">
                <LottoLottie size={190} speed={1.05} />
              </div>
            </GameCard>

            <GameCard title="21點" online={0} disabled href="/casino/blackjack" />
          </div>

          {/* 👇 社交入口卡片（你原本已新增） */}
          <SocialEntrances />

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

      {/* 局部 CSS：Header 兩列 + Lottie 定位 */}
      <style jsx global>{`
        /* Header：直向排列，跑馬燈獨立一列 */
        .lb-header { display: flex; flex-direction: column; gap: 6px; padding: 8px 16px; position: relative; z-index: 10; }
        .lb-header-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .lb-header-marquee { overflow: hidden; padding: 2px 0 0; z-index: 5; }

        /* Lottie 覆蓋位置微調 */
        .game-card { position: relative; overflow: hidden; }
        .game-card .gc-overlay.gc-right {
          position: absolute; right: 8px; top: 50%;
          transform: translateY(-50%); pointer-events: none;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,.35));
        }
        @media (max-width: 640px) {
          .game-card .gc-overlay.gc-right { right: 4px; transform: translateY(-50%) scale(.9); }
        }
      `}</style>
    </main>
  );
}
