"use client";

// ✅ 一次載入大廳樣式 + 頭框特效樣式 + 本次補充樣式
import "@/public/styles/lobby.css";
import "@/public/styles/headframes.css";
import "@/public/styles/lobby-extras.css";

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

type Announcement = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  createdAt?: string;
};

export default function LobbyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // 跑馬燈資料
  const [marquee, setMarquee] = useState<string[]>([]);

  // 週排行榜
  const [weeklyLB, setWeeklyLB] = useState<LbItem[]>([]);

  // 公告
  const [anns, setAnns] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // 跑馬燈（對應後台跑馬燈）
  useEffect(() => {
    fetch("/api/marquee", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMarquee(d.texts ?? []))
      .catch(() => setMarquee([]));
  }, []);

  // 公告（對應後台公告：只顯示啟用的）
  useEffect(() => {
    fetch("/api/announcement?enabled=1&limit=10", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAnns(d.items ?? []))
      .catch(() => setAnns([]));
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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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

          {/* 銀行卡片 */}
          <div className="lb-bank" aria-label="銀行">
            <div className="lb-bank__head">
              <div className="lb-bank__title">銀行</div>
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

          {/* 公告卡片（對應後台公告） */}
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

          {/* 週排行榜：動態 */}
          <Leaderboard title="排行榜（週）" items={weeklyLB} />
        </aside>

        {/* 中欄 */}
        <section className="lb-main">
          <div className="lb-games">
            <GameCard title="百家樂" online={328} countdown={27} href="/casino/baccarat" />
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
