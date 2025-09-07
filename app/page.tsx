// app/page.tsx  或 app/(public)/page.tsx
"use client";

// ✅ 一次載入大廳樣式 + 頭框特效樣式
import "@/public/styles/lobby.css";
import "@/public/styles/headframes.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import Clock from "@/components/lobby/Clock";
import ThemeToggle from "@/components/lobby/ThemeToggle";
import AnnouncementTicker from "@/components/lobby/AnnouncementTicker";
import ProfileCard from "@/components/lobby/ProfileCard";
import GameCard from "@/components/lobby/GameCard";
import ChatBox from "@/components/lobby/ChatBox";
import ServiceWidget from "@/components/lobby/ServiceWidget";
import Leaderboard from "@/components/lobby/Leaderboard";

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

export default function LobbyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // 跑馬燈資料
  const [marquee, setMarquee] = useState<string[]>([]);

  // 週排行榜
  const [weeklyLB, setWeeklyLB] = useState<LbItem[]>([]);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // 跑馬燈
  useEffect(() => {
    fetch("/api/marquee", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMarquee(d.texts ?? []))
      .catch(() => setMarquee([]));
  }, []);

  // 週排行榜
  useEffect(() => {
    fetch("/api/leaderboard?period=WEEKLY&limit=10", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setWeeklyLB(d.items ?? []))
      .catch(() => setWeeklyLB([]));
  }, []);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <main className="lb-wrap">
      <div className="lb-bg" />
      <div className="lb-particles" aria-hidden />

      {/* Header */}
      <header className="lb-header">
        <div className="left">
          <div className="lb-logo">TOPZCASINO</div>
          <span className="lb-beta">LOBBY</span>
        </div>

        <div className="center">
          <AnnouncementTicker items={marquee.length ? marquee : [
            "🎉 新手禮包開放領取！",
            "🔥 百家樂 R60 房間將於 21:00 開新局",
            "💎 連續簽到 7 天可抽稀有徽章",
          ]}/>
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

          {/* 公告卡片：簡單把公告列出（你也可以做成彈窗） */}
          <div className="lb-card">
            <div className="lb-card-title">公告 / 目前尚未開放許多功能</div>
            <ul className="lb-list soft" id="ann-list">
              {/* 預留：你要的就緒狀態，或之後拉 API */}
              {/* 若想要即時拉 API，也可以在這裡 fetch /api/announcements */}
            </ul>
          </div>

          {/* 週排行榜：換成動態 */}
          <Leaderboard title="排行榜（週）" items={weeklyLB} />
        </aside>

        {/* 中欄 */}
        <section className="lb-main">
          <div className="lb-games">
            <GameCard title="百家樂" online={328} countdown={27} href="@/casino/baccarat" />
            <GameCard title="骰寶" online={152} countdown={41} href="/casino/sicbo" />
            <GameCard title="樂透" online={93} href="/casino/lotto" />
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
    </main>
  );
}
