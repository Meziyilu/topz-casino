// app/(public)/page.tsx
"use client";

import "./lobby-theme.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** ====== 小工具：時鐘 ====== */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hhmmss = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }, [now]);
  return hhmmss;
}

/** ====== 小工具：主題切換（data-theme="dark" | "light"） ====== */
function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(
    (typeof window !== "undefined" && (localStorage.getItem("tc-theme") as "dark" | "light")) || "dark"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tc-theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) };
}

/** ====== Header：Logo / 公告 pill / 時鐘 + 主題鍵 + 個人頁 ====== */
function LobbyHeader() {
  const time = useClock();
  const { theme, toggle } = useTheme();

  return (
    <header className="lv-header">
      <div className="lv-logo">TOPZCASINO</div>

      <div className="lv-ann-pill" title="最新公告與活動">
        🎉 歡迎來到 Topzcasino！新手活動開跑・每日簽到・限時加碼派彩！
      </div>

      <div className="lv-head-tools">
        <span className="lv-clock" aria-label="current-time">{time}</span>
        <button className="lv-theme" onClick={toggle} aria-label="toggle-theme">
          {theme === "dark" ? "☀︎" : "☾"}
        </button>
        <Link className="lv-profile" href="/profile" title="我的資料">
          我
        </Link>
      </div>
    </header>
  );
}

/** ====== 左欄：玩家資訊 / 快捷入口 / 排行榜 / 公告 ====== */
function ProfileCard() {
  return (
    <section className="lv-card lv-profile">
      <div className="lv-avatar">
        <div className="lv-frame" />
        <img alt="avatar" src="/avatar.png" />
      </div>
      <div className="lv-user-info">
        <div className="lv-name">玩家名稱</div>
        <div className="lv-vip">VIP 3</div>
      </div>

      <div className="lv-balance">
        <div className="lv-b-item">
          <span>錢包</span>
          <b>12,345</b>
        </div>
        <div className="lv-b-item">
          <span>銀行</span>
          <b>88,000</b>
        </div>
      </div>

      <div className="lv-quick">
        <Link href="/checkin" className="lv-quick-btn">簽到</Link>
        <Link href="/leaderboard" className="lv-quick-btn">排行榜</Link>
        <Link href="/rewards" className="lv-quick-btn">活動</Link>
      </div>
    </section>
  );
}

function EntryLinks() {
  return (
    <section className="lv-card lv-entries">
      <Link href="/wallet" className="lv-entry">🏦 銀行/錢包</Link>
      <Link href="/shop" className="lv-entry">🛍 商店</Link>
      <Link href="/admin" className="lv-entry">⚙️ 管理</Link>
    </section>
  );
}

function LeaderboardCard() {
  return (
    <section className="lv-card lv-leader">
      <h3>本週盈利榜 Top 5</h3>
      <ol className="lv-lead-list">
        <li><span className="rank">1</span><span className="name">Alpha</span><span className="val">+ 52,300</span></li>
        <li><span className="rank">2</span><span className="name">Bravo</span><span className="val">+ 41,800</span></li>
        <li><span className="rank">3</span><span className="name">Charlie</span><span className="val">+ 33,600</span></li>
        <li><span className="rank">4</span><span className="name">Delta</span><span className="val">+ 20,500</span></li>
        <li><span className="rank">5</span><span className="name">Echo</span><span className="val">+ 18,900</span></li>
      </ol>
    </section>
  );
}

function AnnouncementCard() {
  return (
    <section className="lv-card lv-bulletin">
      <h3>最新公告 / 活動</h3>
      <ul className="lv-bull-list">
        <li>【活動】連續簽到 7 天送 VIP 經驗</li>
        <li>【公告】百家樂 R60 房晚間維護</li>
        <li>【活動】儲值滿額回饋 10%</li>
      </ul>
    </section>
  );
}

/** ====== 中欄：遊戲卡與聊天室 ====== */
function GameCard({ title, href, online, countdown }: { title: string; href: string; online: number; countdown: string; }) {
  return (
    <Link href={href} className="lv-game">
      <div className="lv-game-head">
        <h4>{title}</h4>
        <span className="lv-game-online">👥 {online}</span>
      </div>
      <div className="lv-game-body">
        <div className="lv-game-timer">⏳ {countdown}</div>
      </div>
    </Link>
  );
}

function GameGrid() {
  return (
    <section className="lv-games">
      <GameCard title="百家樂" href="/casino/baccarat" online={128} countdown="00:25" />
      <GameCard title="骰寶" href="/casino/sicbo" online={73} countdown="00:18" />
      <GameCard title="樂透" href="/casino/lotto" online={45} countdown="09:12" />
      <GameCard title="21 點" href="/casino/blackjack" online={12} countdown="—" />
    </section>
  );
}

function ChatBox() {
  const [list, setList] = useState<{ id: string; who: "USER" | "SYSTEM"; text: string; }[]>([
    { id: "sys1", who: "SYSTEM", text: "歡迎來到大廳，祝您遊戲愉快！" },
  ]);
  const [text, setText] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setList(prev => [...prev, { id: String(Date.now()), who: "USER", text }]);
    setText("");
    // TODO: 之後串 /api/chat/send
  }

  return (
    <section className="lv-card lv-chat">
      <div className="lv-chat-list" id="chat-scroll">
        {list.map(m => (
          <div key={m.id} className={`lv-chat-row ${m.who === "SYSTEM" ? "sys" : ""}`}>
            <span className="who">{m.who === "SYSTEM" ? "系統" : "我"}</span>
            <span className="text">{m.text}</span>
          </div>
        ))}
      </div>
      <form className="lv-chat-input" onSubmit={send}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="在大廳聊天…"
          maxLength={200}
        />
        <button>送出</button>
      </form>
    </section>
  );
}

/** ====== 右下：客服小工具 ====== */
function ServiceWidget() {
  return (
    <aside className="lv-service">
      <Link href="/support" className="lv-service-btn">❓ FAQ</Link>
      <Link href="/support" className="lv-service-btn lv-live">💬 Live Help</Link>
    </aside>
  );
}

/** ====== 主頁面（組版） ====== */
export default function LobbyPage() {
  return (
    <div className="lv-bg">
      <div className="lv-particles" aria-hidden />
      <LobbyHeader />

      <div className="lv-shell">
        {/* 左欄 */}
        <div className="lv-col-left">
          <ProfileCard />
          <EntryLinks />
          <LeaderboardCard />
          <AnnouncementCard />
        </div>

        {/* 中欄 */}
        <div className="lv-col-main">
          <GameGrid />
          <ChatBox />
        </div>

        {/* 右欄暫空（保留擴充用），客服浮動 */}
        <div className="lv-col-right" />
      </div>

      <ServiceWidget />
    </div>
  );
}
