"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import Link from "next/link";

type MeResp = { user?: { id: string; email: string; name?: string | null; balance: number } };

function fmtTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function LobbyPage() {
  // 即時：目前時間 & 錢包餘額（保持你原本的輪詢頻率）
  const [nowStr, setNowStr] = useState(fmtTime());
  const [me, setMe] = useState<MeResp["user"] | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNowStr(fmtTime()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadMe() {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const j: MeResp = await r.json();
        if (alive && r.ok) setMe(j.user ?? null);
      } catch {}
    }
    loadMe();
    const t = setInterval(loadMe, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* 銀河背景（低雜訊，緩慢流動） */}
      <div className="absolute inset-0 galaxy-bg pointer-events-none" aria-hidden />

      {/* 內容層 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* 跑馬燈 + 公告卡（皆保留） */}
        <section className="space-y-4">
          {/* 跑馬燈 */}
          <div className="marquee-card glass-strong ring-1 ring-white/10 rounded-2xl overflow-hidden">
            <div className="marquee-track">
              <span className="marquee-item">
                🎉 歡迎來到 TOPZ Casino · 本館提倡理性娛樂 · 未滿 18 歲請勿參與 ·
                系統將定時派盤，請把握下注時間。
              </span>
              <span className="marquee-item" aria-hidden>
                🎉 歡迎來到 TOPZ Casino · 本館提倡理性娛樂 · 未滿 18 歲請勿參與 ·
                系統將定時派盤，請把握下注時間。
              </span>
            </div>
          </div>

          {/* 公告卡（獨立卡片與欄位，保留以後要串 /api/announcement 的版位） */}
          <div className="glass-strong ring-1 ring-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">📢 公告</h2>
              <Link href="/announcements" className="text-sm opacity-80 hover:opacity-100 underline">
                查看全部
              </Link>
            </div>
            <div className="mt-2 text-sm opacity-90">
              {/* 這裡未串 API 時，可先放你最近一則公告的 placeholder */}
              目前暫無新公告。
            </div>
          </div>
        </section>

        {/* 個資/時間/錢包（保留） */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard title="玩家" value={me?.name || me?.email || "未登入"} />
          <InfoCard title="目前時間" value={nowStr} />
          <InfoCard title="錢包餘額" value={typeof me?.balance === "number" ? `${me!.balance} 元` : "—"} />
          {/* 深色/淺色切換（保留你原本的 toggle 邏輯；這裡僅提供一個位子） */}
          <ThemeSwitcherCard />
        </section>

        {/* 遊戲房卡（可擴充更多房間，保留既有連結） */}
        <section>
          <h2 className="text-xl font-bold mb-3">🎮 遊戲大廳</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <RoomCard code="R30" name="百家樂 · R30" href="/casino/baccarat/R30" />
            <RoomCard code="R60" name="百家樂 · R60" href="/casino/baccarat/R60" />
            <RoomCard code="R90" name="百家樂 · R90" href="/casino/baccarat/R90" />
          </div>
        </section>

        {/* 工具區：銀行、管理後台、登出（保留） */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/bank" className="tool-card glass-strong ring-1 ring-white/10">
            🏦 銀行面板
          </Link>
          <Link href="/admin" className="tool-card glass-strong ring-1 ring-white/10">
            🛠️ 管理後台
          </Link>
          <Link href="/auth?logout=1" className="tool-card glass-strong ring-1 ring-white/10">
            🚪 登出
          </Link>
        </section>
      </main>

      {/* Tawk.to 客服（只在大廳載入） */}
      <Script id="tawk-to" strategy="afterInteractive">
        {`
          var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
          (function(){
            var s1=document.createElement("script"), s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/68b349c7d19aeb19234310df/1j3u5gcnb';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
          })();
        `}
      </Script>
    </div>
  );
}

/* ===== 小元件（原本板位不變；樣式用 globals.css 控） ===== */

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 glass-strong ring-1 ring-white/10">
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function ThemeSwitcherCard() {
  // 這裡僅留位置與樣式；你的主題切換邏輯可直接綁在按鈕 onClick
  return (
    <div className="rounded-2xl p-4 glass-strong ring-1 ring-white/10 flex items-center justify-between">
      <div>
        <div className="text-xs opacity-70">外觀</div>
        <div className="text-xl font-bold mt-1">深色 / 淺色</div>
      </div>
      <button
        type="button"
        className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/35 transition"
        onClick={() => {
          // 建議沿用你現有的切換方式（ex: data-theme 切換）
          const root = document.documentElement;
          const current = root.getAttribute("data-theme") || "dark";
          root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
        }}
      >
        切換
      </button>
    </div>
  );
}

function RoomCard({ code, name, href }: { code: string; name: string; href: string }) {
  return (
    <Link
      href={href}
      className="room-card block rounded-2xl p-5 glass-strong ring-1 ring-white/10 hover:ring-white/25 transition"
    >
      <div className="text-sm opacity-70">房間 {code}</div>
      <div className="text-2xl font-extrabold mt-1">{name}</div>
      <div className="mt-6 text-right text-sm opacity-80">進入 ➜</div>
    </Link>
  );
}
