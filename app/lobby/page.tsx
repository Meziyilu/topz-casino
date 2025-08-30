"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

type MeResp = { user?: { id: string; email: string; name?: string | null; balance: number; isAdmin?: boolean } };
type AnnounceResp = { title: string; content: string } | null;
type MarqueeResp = { text: string } | null;

function tNow(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function LobbyPage() {
  // 時間
  const [clock, setClock] = useState(tNow());
  useEffect(() => { const t = setInterval(() => setClock(tNow()), 1000); return () => clearInterval(t); }, []);

  // 會員（錢包輪詢）
  const [me, setMe] = useState<MeResp["user"] | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const j: MeResp = await r.json();
        if (live && r.ok) setMe(j.user ?? null);
      } catch {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => { live = false; clearInterval(t); };
  }, []);

  // 公告/跑馬燈（有就用、沒有就預設）
  const [announcement, setAnnouncement] = useState<AnnounceResp>(null);
  const [marquee, setMarquee] = useState<MarqueeResp>(null);
  useEffect(() => {
    (async () => {
      try { const r1 = await fetch("/api/announcement", { cache: "no-store" }); if (r1.ok) setAnnouncement(await r1.json()); } catch {}
      try { const r2 = await fetch("/api/marquee", { cache: "no-store" }); if (r2.ok) setMarquee(await r2.json()); } catch {}
      if (!announcement) setAnnouncement({ title: "系統公告", content: "歡迎來到 TOPZ Casino！祝您手氣長紅～" });
      if (!marquee) setMarquee({ text: "新手禮包即將開放，敬請期待 ∙ 祝您手氣長紅 ∙ 下注請量力而為" });
    })();
  }, []);

  const roleLabel = me?.isAdmin ? "管理員" : "會員";

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 lobby-cosmos" aria-hidden />
      <div className="absolute inset-0 lobby-stars" aria-hidden />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* 跑馬燈 */}
        <div className="marquee bar">
          <div className="marquee-track">
            <span className="marquee-text">{marquee?.text}</span>
            <span className="marquee-text" aria-hidden>{marquee?.text}</span>
          </div>
        </div>

        {/* 膠囊資訊 + 功能動作 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：四個資訊膠囊 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
            <Capsule title="現在時間" value={clock} large />
            <Capsule title="帳號" value={me?.email ?? "—"} />
            <Capsule title="錢包" value={typeof me?.balance === "number" ? `${me!.balance}` : "—"} />
            <Capsule title="身份" value={roleLabel} />
          </div>

          {/* 右：動作膠囊 */}
          <div className="grid grid-cols-3 gap-4">
            <Link href="/bank" className="capsule link"><span>銀行</span></Link>
            <Link href="/admin" className="capsule link"><span>管理後台</span></Link>
            <a href="/api/auth/logout" className="capsule link"><span>登出</span></a>
          </div>
        </div>

        {/* 房間卡 */}
        <section className="space-y-4">
          <h2 className="lobby-section-title">遊戲房間</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RoomCard code="R30" name="快速廳 R30" seconds={30} href="/casino/baccarat/R30" />
            <RoomCard code="R60" name="經典廳 R60" seconds={60} href="/casino/baccarat/R60" />
            <RoomCard code="R90" name="沉浸廳 R90" seconds={90} href="/casino/baccarat/R90" />
          </div>
        </section>

        {/* Coming soon */}
        <section className="space-y-4">
          <h2 className="lobby-section-title">COMING SOON</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComingCard title="全新玩法" desc="我們正在準備更多房型與遊戲模式，敬請期待 ✨" />
            <ComingCard title={announcement?.title ?? "系統公告"} desc={announcement?.content ?? ""} />
          </div>
        </section>
      </main>

      {/* 客服 Script（lazy 載入） */}
      <Script id="tawk" strategy="lazyOnload">
        {`
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
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

/* ===== 小元件 ===== */

function Capsule({ title, value, large }: { title: string; value: string; large?: boolean }) {
  return (
    <div className={`capsule ${large ? "capsule-lg" : ""}`}>
      <div className="capsule-title">{title}</div>
      <div className="capsule-value">{value}</div>
    </div>
  );
}

function RoomCard({ code, name, seconds, href }: { code: string; name: string; seconds: number; href: string }) {
  return (
    <Link href={href} className="room-card group">
      <div className="room-head">
        <div className="room-sub">Baccarat</div>
        <div className="room-title">{name}</div>
        <div className="room-desc">每局 {seconds} 秒，節奏爽快</div>
      </div>
      <div className="room-foot">
        <span className="room-tag">每局 {seconds}s</span>
        <span className="room-enter">進入</span>
      </div>
    </Link>
  );
}

function ComingCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="coming-card">
      <div className="coming-title">{title}</div>
      <div className="coming-desc">{desc}</div>
      <div className="coming-badge">開發中</div>
    </div>
  );
}
