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
import CheckinCard from "@/components/lobby/CheckinCard"; // ⬅ 新增：簽到卡
import BankLottie from "@/components/bank/BankLottie";   // ⬅ 新增：銀行動畫

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

// ⬇ 給輪盤大廳卡片用的 Overview 型別（和後端對齊：msLeft 為毫秒）
type RouletteOverview = {
  phase: "BETTING" | "REVEALING" | "SETTLED";
  msLeft: number;        // 後端回傳剩餘毫秒
  online?: number;       // 可選：當前在線數
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

  // ✅ 輪盤卡片：倒數 & 在線（以 RL_R60 為大廳顯示房）
  const [rlCountdown, setRlCountdown] = useState<number>(0); // 以秒為單位
  const [rlOnline, setRlOnline] = useState<number>(0);

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

  // ✅ 讀取輪盤 RL_R60 房間的 Overview：每 5 秒同步一次，並本地每秒倒數
  useEffect(() => {
    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const loadRoulette = async () => {
      try {
        const r = await fetch("/api/casino/roulette/overview?room=RL_R60", { cache: "no-store" });
        if (!r.ok) throw new Error("bad");
        const d: RouletteOverview | { ms_left?: number; online?: number; phase?: string } = await r.json();

        // 兼容 msLeft / ms_left
        const ms =
          typeof (d as RouletteOverview).msLeft === "number"
            ? (d as RouletteOverview).msLeft
            : typeof (d as any).ms_left === "number"
              ? (d as any).ms_left
              : 0;

        setRlCountdown(Math.max(0, Math.ceil(ms / 1000)));
        setRlOnline((d as any).online ?? 0);
      } catch {
        // 若失敗：給個預設值（例如 30 秒），避免 UI 空白
        setRlCountdown((s) => (s > 0 ? s : 30));
      }
    };

    // 第一次載入
    loadRoulette();

    // 本地每秒倒數
    tickTimer = setInterval(() => {
      setRlCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    // 每 5 秒向伺服器同步一次（避免本地與伺服器漂移）
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

          {/* ✅ 新增：每日簽到卡片 */}
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
            {/* ✅ 新增：輪盤卡片（會顯示 RL_R60 的倒數與在線） */}
            <GameCard title="輪盤" online={rlOnline} countdown={rlCountdown} href="/casino/roulette" />

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
