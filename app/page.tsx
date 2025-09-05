// app/page.tsx  或 app/(public)/page.tsx
"use client";
import "@/public/styles/lobby.css"; // 直接 import，避免 public 路徑錯用
import { useEffect, useState } from "react";
import Link from "next/link";
import Clock from "@/components/lobby/Clock";
import ThemeToggle from "@/components/lobby/ThemeToggle";
import AnnouncementTicker from "@/components/lobby/AnnouncementTicker";
import ProfileCard from "@/components/lobby/ProfileCard";
import GameCard from "@/components/lobby/GameCard";
import ChatBox from "@/components/lobby/ChatBox";
import ServiceWidget from "@/components/lobby/ServiceWidget";

type Me = {
  id: string;
  displayName: string;
  balance: number;
  bankBalance: number;
  vipTier: number;
  avatarUrl?: string | null;
};

export default function LobbyPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

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
          <AnnouncementTicker
            items={[
              "🎉 新手禮包開放領取！",
              "🔥 百家樂 R60 房間將於 21:00 開新局",
              "💎 連續簽到 7 天可抽稀有徽章",
            ]}
          />
        </div>

        <div className="right">
          <Clock />
          <ThemeToggle />
          <Link href="/profile" className="lb-user-mini">
            <span className="name">{me?.displayName ?? "玩家"}</span>
          </Link>
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
          />

          <div className="lb-card">
            <div className="lb-card-title">功能入口</div>
            <div className="lb-actions">
              <Link href="/wallet" className="lb-btn">
                🏦 銀行
              </Link>
              <Link href="/shop" className="lb-btn">
                🛍 商店
              </Link>
              <Link href="/admin" className="lb-btn">
                ⚙️ 管理
              </Link>
            </div>
          </div>

          <div className="lb-card">
            <div className="lb-card-title">排行榜（週）</div>
            <ol className="lb-list">
              <li>
                #1 王牌玩家 <span>+12,400</span>
              </li>
              <li>
                #2 LuckyStar <span>+8,210</span>
              </li>
              <li>
                #3 黑桃A <span>+6,420</span>
              </li>
              <li>
                #4 Neon <span>+4,900</span>
              </li>
              <li>
                #5 Nova <span>+3,110</span>
              </li>
            </ol>
          </div>

          <div className="lb-card">
            <div className="lb-card-title">公告 / 活動</div>
            <ul className="lb-list soft">
              <li>🎁 回饋活動加碼至 120%</li>
              <li>🧧 連續登入送紅包券</li>
              <li>🛠 系統維護 02:00 - 03:00</li>
            </ul>
          </div>
        </aside>

        {/* 中欄：遊戲 / 聊天 */}
        <section className="lb-main">
          <div className="lb-games">
            <GameCard title="百家樂" online={328} countdown={27} href="/casino/baccarat" />
            <GameCard title="骰寶" online={152} countdown={41} href="/casino/sicbo" />
            <GameCard title="樂透" online={93} href="/casino/lotto" />
            <GameCard title="21點" online={0} disabled href="/casino/blackjack" />
          </div>

          <ChatBox room="LOBBY" />
        </section>

        {/* 右欄：保留空位（之後擴充） */}
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
