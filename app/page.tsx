// app/page.tsx  或 app/(public)/page.tsx
"use client";

// ✅ 一次載入大廳樣式 + 頭框特效樣式（保持你既有風格）
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

type BankMe = {
  wallet: number;
  bank: number;
  dailyOut: number;
};

export default function LobbyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Bank 狀態
  const [bank, setBank] = useState<BankMe | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 表單：存/提/轉
  const [depAmount, setDepAmount] = useState<string>("");
  const [wdAmount, setWdAmount] = useState<string>("");
  const [tfAmount, setTfAmount] = useState<string>("");
  const [tfToUser, setTfToUser] = useState<string>("");

  // 讀取當前使用者（你原本就有）
  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // 讀取銀行資訊（依賴登入）
  useEffect(() => {
    if (!me?.id) return;
    refreshBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  async function refreshBank() {
    try {
      setBankLoading(true);
      const r = await fetch("/api/bank/me", { credentials: "include" });
      if (!r.ok) throw new Error("ME_FAIL");
      const d = await r.json();
      if (!d?.ok) throw new Error("ME_FAIL");
      setBank({ wallet: d.wallet, bank: d.bank, dailyOut: d.dailyOut });
    } catch {
      setToast("無法讀取銀行資訊");
      setTimeout(() => setToast(null), 1500);
    } finally {
      setBankLoading(false);
    }
  }

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

  // 小工具：數字字串 → 正整數（無效回 null）
  const toInt = (s: string) => {
    const n = Number(s);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  // 存款（錢包 → 銀行）
  async function handleDeposit() {
    const amount = toInt(depAmount);
    if (!amount) {
      setToast("請輸入有效的存款金額");
      setTimeout(() => setToast(null), 1200);
      return;
    }
    try {
      const r = await fetch("/api/bank/deposit", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.error || "DEPOSIT_FAIL");
      // 同步兩邊餘額
      setMe((prev) => (prev ? { ...prev, balance: d.wallet, bankBalance: d.bank } : prev));
      await refreshBank();
      setDepAmount("");
      setToast("已存入銀行 ✅");
      setTimeout(() => setToast(null), 1200);
    } catch (e: any) {
      setToast(e?.message === "WALLET_NOT_ENOUGH" ? "錢包餘額不足" : "存款失敗");
      setTimeout(() => setToast(null), 1500);
    }
  }

  // 提領（銀行 → 錢包）
  async function handleWithdraw() {
    const amount = toInt(wdAmount);
    if (!amount) {
      setToast("請輸入有效的提領金額");
      setTimeout(() => setToast(null), 1200);
      return;
    }
    try {
      const r = await fetch("/api/bank/withdraw", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.error || "WITHDRAW_FAIL");
      setMe((prev) => (prev ? { ...prev, balance: d.wallet, bankBalance: d.bank } : prev));
      await refreshBank();
      setWdAmount("");
      setToast("已提領至錢包 ✅");
      setTimeout(() => setToast(null), 1200);
    } catch (e: any) {
      const msg = String(e?.message || "");
      setToast(
        msg === "BANK_NOT_ENOUGH" ? "銀行餘額不足"
          : msg === "DAILY_OUT_LIMIT" ? "超過今日銀行流出上限"
          : "提領失敗"
      );
      setTimeout(() => setToast(null), 1500);
    }
  }

  // 轉帳（銀行 → 他人銀行）
  async function handleTransfer() {
    const amount = toInt(tfAmount);
    const toUserId = tfToUser.trim();
    if (!amount || !toUserId) {
      setToast("請輸入對方 ID 與有效金額");
      setTimeout(() => setToast(null), 1200);
      return;
    }
    try {
      const r = await fetch("/api/bank/transfer", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toUserId, amount }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.error || "TRANSFER_FAIL");
      setMe((prev) => (prev ? { ...prev, balance: d.wallet, bankBalance: d.bank } : prev));
      await refreshBank();
      setTfAmount(""); setTfToUser("");
      setToast("轉帳成功 ✅");
      setTimeout(() => setToast(null), 1200);
    } catch (e: any) {
      const msg = String(e?.message || "");
      setToast(
        msg === "SELF_TRANSFER_NOT_ALLOWED" ? "不可轉帳給自己"
          : msg === "BANK_NOT_ENOUGH" ? "銀行餘額不足"
          : msg === "DAILY_OUT_LIMIT" ? "超過今日銀行流出上限"
          : "轉帳失敗"
      );
      setTimeout(() => setToast(null), 1500);
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
            items={[
              "🎉 新手禮包開放領取！",
              "🔥 百家樂 R60 房間將於 21:00 開新局",
              "💎 連續簽到 7 天可抽稀有徽章",
            ]}
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
            // ✅ 同步個人頁：把頭框 / 面板色一起丟進去
            headframe={me?.headframe ?? undefined}
            panelTint={me?.panelTint ?? undefined}
          />

          {/* ✅ 新增：銀行操作區塊（直接串 /api/bank/*） */}
          <div className="lb-card">
            <div className="lb-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>銀行</span>
              <button className="lb-btn" onClick={refreshBank} disabled={bankLoading}>重新整理</button>
            </div>

            <div className="lb-bank-rows">
              <div className="lb-bank-kv"><span>錢包</span><b>{(bank?.wallet ?? me?.balance ?? 0).toLocaleString()}</b></div>
              <div className="lb-bank-kv"><span>銀行</span><b>{(bank?.bank   ?? me?.bankBalance ?? 0).toLocaleString()}</b></div>
              <div className="lb-bank-kv"><span>今日銀行流出</span><b>{(bank?.dailyOut ?? 0).toLocaleString()}</b></div>
            </div>

            <div className="lb-bank-forms">
              {/* 存款 */}
              <div className="lb-bank-row">
                <input
                  className="lb-input"
                  type="number"
                  placeholder="存款金額（錢包 → 銀行）"
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  min={1}
                />
                <button className="lb-btn" onClick={handleDeposit}>存款</button>
              </div>

              {/* 提領 */}
              <div className="lb-bank-row">
                <input
                  className="lb-input"
                  type="number"
                  placeholder="提領金額（銀行 → 錢包）"
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  min={1}
                />
                <button className="lb-btn" onClick={handleWithdraw}>提領</button>
              </div>

              {/* 轉帳 */}
              <div className="lb-bank-row">
                <input
                  className="lb-input"
                  type="text"
                  placeholder="對方使用者 ID"
                  value={tfToUser}
                  onChange={(e) => setTfToUser(e.target.value)}
                />
              </div>
              <div className="lb-bank-row">
                <input
                  className="lb-input"
                  type="number"
                  placeholder="轉帳金額（銀行 → 對方銀行）"
                  value={tfAmount}
                  onChange={(e) => setTfAmount(e.target.value)}
                  min={1}
                />
                <button className="lb-btn" onClick={handleTransfer}>轉帳</button>
              </div>
            </div>

            {toast && <div className="lb-toast">{toast}</div>}
          </div>

          <div className="lb-card">
            <div className="lb-card-title">功能入口</div>
            <div className="lb-actions">
              <Link href="/wallet" className="lb-btn">🏦 銀行</Link>
              <Link href="/shop" className="lb-btn">🛍 商店</Link>
              <Link href="/admin" className="lb-btn">⚙️ 管理</Link>
            </div>
          </div>

          <div className="lb-card">
            <div className="lb-card-title">排行榜（週）</div>
            <ol className="lb-list">
              <li>#1 王牌玩家 <span>+12,400</span></li>
              <li>#2 LuckyStar <span>+8,210</span></li>
              <li>#3 黑桃A <span>+6,420</span></li>
              <li>#4 Neon <span>+4,900</span></li>
              <li>#5 Nova <span>+3,110</span></li>
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
