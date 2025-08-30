"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

type MeResp = { user?: { id: string; email: string; name?: string | null; balance: number } };
type AnnounceResp = { title: string; content: string; updatedAt?: string } | null;
type MarqueeResp = { text: string } | null;

function fmtTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function LobbyPage() {
  // 即時時間
  const [nowStr, setNowStr] = useState(fmtTime());
  useEffect(() => {
    const t = setInterval(() => setNowStr(fmtTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // 會員資訊（錢包）
  const [me, setMe] = useState<MeResp["user"] | null>(null);
  useEffect(() => {
    let alive = true;
    async function loadMe() {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const j: MeResp = await r.json();
        if (alive && r.ok) setMe(j.user ?? null);
      } catch {
        // ignore
      }
    }
    loadMe();
    const t = setInterval(loadMe, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // 公告 + 跑馬燈（不改 API，若無則降級顯示預設）
  const [announce, setAnnounce] = useState<AnnounceResp>(null);
  const [marquee, setMarquee] = useState<MarqueeResp>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r1 = await fetch("/api/announcement", { cache: "no-store" });
        if (r1.ok) setAnnounce(await r1.json());
      } catch {}
      try {
        const r2 = await fetch("/api/marquee", { cache: "no-store" });
        if (r2.ok) setMarquee(await r2.json());
      } catch {}
      if (alive) {
        if (!announce) setAnnounce({ title: "系統公告", content: "歡迎來到 TOPZ CASINO！祝您遊戲愉快。" });
        if (!marquee) setMarquee({ text: "🔥 新手活動進行中：每日登入贈幣，祝您手氣長紅！" });
      }
    })();
    const t = setInterval(async () => {
      try {
        const r2 = await fetch("/api/marquee", { cache: "no-store" });
        if (r2.ok) setMarquee(await r2.json());
      } catch {}
    }, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* 銀河背景（柔和版） */}
      <div className="absolute inset-0 galaxy-bg pointer-events-none" aria-hidden />
      <div className="absolute inset-0 galaxy-stars pointer-events-none" aria-hidden />

      {/* 內容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* 跑馬燈 */}
        <div className="marquee-wrap glass-strong rounded-2xl overflow-hidden">
          <div className="marquee-track">
            <span className="marquee-text">
              {marquee?.text ?? "歡迎來到 TOPZ CASINO！"}
            </span>
            <span className="marquee-text" aria-hidden>
              {marquee?.text ?? "歡迎來到 TOPZ CASINO！"}
            </span>
          </div>
        </div>

        {/* 上排資訊卡：時間 / 會員 / 銀行 / 管理 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 現在時間 */}
          <div className="card-outer">
            <div className="card-inner">
              <div className="card-title">目前時間</div>
              <div className="card-value text-2xl font-extrabold tracking-wider">{nowStr}</div>
              <div className="card-foot opacity-70 text-xs">以瀏覽器時間為準</div>
            </div>
          </div>

          {/* 玩家資訊 */}
          <Link href="/profile" className="card-outer group">
            <div className="card-inner">
              <div className="card-title">玩家資訊</div>
              <div className="space-y-1">
                <div className="flex justify-between opacity-90">
                  <span>帳號</span>
                  <span className="font-semibold">{me?.email ?? "未登入"}</span>
                </div>
                <div className="flex justify-between opacity-90">
                  <span>暱稱</span>
                  <span className="font-semibold">{me?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>錢包餘額</span>
                  <span className="text-xl font-extrabold">{me?.balance ?? 0}</span>
                </div>
              </div>
              <div className="card-foot">點此管理個人資料</div>
            </div>
          </Link>

          {/* 銀行面板 */}
          <Link href="/bank" className="card-outer group">
            <div className="card-inner">
              <div className="card-title">銀行面板</div>
              <p className="opacity-90">轉入/轉出、查交易紀錄。</p>
              <div className="card-foot">點此前往</div>
            </div>
          </Link>

          {/* 管理面板（僅顯示連結，不做權限判斷於此） */}
          <Link href="/admin" className="card-outer group">
            <div className="card-inner">
              <div className="card-title">管理後台</div>
              <p className="opacity-90">發幣/扣幣、公告、跑馬燈、會員、交易、房間。</p>
              <div className="card-foot">點此前往（需管理員）</div>
            </div>
          </Link>
        </div>

        {/* 公告卡 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card-outer lg:col-span-3">
            <div className="card-inner">
              <div className="card-title flex items-center gap-2">
                <span>最新公告</span>
                {announce?.updatedAt && (
                  <span className="badge">更新於 {new Date(announce.updatedAt).toLocaleString()}</span>
                )}
              </div>
              <div className="prose-invert opacity-95 leading-relaxed whitespace-pre-wrap">
                <div className="font-semibold text-lg mb-2">{announce?.title ?? "系統公告"}</div>
                <div>{announce?.content ?? "歡迎來到 TOPZ CASINO！祝您遊戲愉快。"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 遊戲房卡（既有三房） */}
        <section className="space-y-4">
          <h2 className="section-title">百家樂房間</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <RoomCard code="R30" name="快速場 R30" href="/casino/baccarat/R30" />
            <RoomCard code="R60" name="標準場 R60" href="/casino/baccarat/R60" />
            <RoomCard code="R90" name="長考場 R90" href="/casino/baccarat/R90" />
          </div>
        </section>

        {/* 預備開放（不可點） */}
        <section className="space-y-4">
          <h2 className="section-title">預備開放</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <RoomCardDisabled name="輪盤 Roulette" />
            <RoomCardDisabled name="21點 Blackjack" />
            <RoomCardDisabled name="德州撲克 Hold'em" />
            <RoomCardDisabled name="龍虎 Dragon-Tiger" />
          </div>
        </section>

        {/* 其他：登出 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link href="/auth" className="card-outer group">
            <div className="card-inner">
              <div className="card-title">登入 / 註冊</div>
              <div className="card-foot">切換帳號或新建帳號</div>
            </div>
          </Link>
          <a href="/api/auth/logout" className="card-outer group">
            <div className="card-inner">
              <div className="card-title">登出</div>
              <div className="card-foot">點此安全登出</div>
            </div>
          </a>
        </div>
      </main>

      {/* Tawk.to 客服（你提供的 script） */}
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

/* ============== 小元件 ============== */

function RoomCard({ code, name, href }: { code: string; name: string; href: string }) {
  return (
    <Link href={href} className="card-outer group hover:scale-[1.02] transition-transform">
      <div className="card-inner">
        <div className="card-title flex items-center justify-between">
          <span>{name}</span>
          <span className="badge">#{code}</span>
        </div>
        <p className="opacity-90">進入房間開始下注、觀戰與歷史路子。</p>
        <div className="card-foot">立即進入</div>
      </div>
    </Link>
  );
}

function RoomCardDisabled({ name }: { name: string }) {
  return (
    <div className="card-outer is-disabled">
      <div className="card-inner">
        <div className="card-title flex items-center justify-between">
          <span>{name}</span>
          <span className="badge badge-warn">即將開放</span>
        </div>
        <p className="opacity-70">敬請期待。</p>
        <div className="card-foot">尚未開放</div>
      </div>
    </div>
  );
}
