// app/lobby/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script"; // 載入客服腳本
import CheckinCard from "@/components/CheckinCard"; // ✅ 正確：在 /components/CheckinCard.tsx

/** 小工具 */
function formatTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** 型別 */
type MeResp = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    isAdmin: boolean;
    balance: number;
    bankBalance: number;
    createdAt: string;
  } | null;
};
type Ann = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
};
type MarqueeConfig = {
  enabled: boolean;
  text: string;
  speed: number; // px/s
  createdAt: string;
};

export default function LobbyPage() {
  const router = useRouter();

  /** ===== 狀態：時間、主題、音效 ===== */
  const [nowStr, setNowStr] = useState(formatTime());
  useEffect(() => {
    const t = setInterval(() => setNowStr(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof localStorage !== "undefined") {
      return (localStorage.getItem("theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const clickSnd = useRef<HTMLAudioElement | null>(null);
  const playClick = () => clickSnd.current?.play().catch(() => {});

  /** ===== 狀態：使用者（輪詢 /api/auth/me） ===== */
  const [me, setMe] = useState<MeResp["user"] | null>(null);
  useEffect(() => {
    let alive = true;
    async function loadMe() {
      try {
        const r = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const j: MeResp = await r.json();
        if (alive && r.ok) setMe(j.user ?? null);
      } catch {}
    }
    loadMe();
    const t = setInterval(loadMe, 5000); // 每 5 秒即時更新餘額/身分
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  /** ===== 狀態：公告、跑馬燈（可選，若沒有 API 也不影響） ===== */
  const [anns, setAnns] = useState<Ann[]>([]);
  const [marq, setMarq] = useState<MarqueeConfig | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await fetch("/api/admin/announcement", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { items: [] }
        );
        if (alive && a?.items) setAnns(a.items as Ann[]);
      } catch {}
      try {
        const m = await fetch("/api/admin/marquee", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        );
        if (alive && m) setMarq(m as MarqueeConfig);
      } catch {}
    })();
    // 60 秒更新一次公告/跑馬燈
    const t = setInterval(async () => {
      try {
        const a = await fetch("/api/admin/announcement", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { items: [] }
        );
        if (alive && a?.items) setAnns(a.items as Ann[]);
      } catch {}
      try {
        const m = await fetch("/api/admin/marquee", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        );
        if (alive && m) setMarq(m as MarqueeConfig);
      } catch {}
    }, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  /** ===== 頂部：跑馬燈 ===== */
  const showMarquee = !!(marq?.enabled && marq.text?.trim());
  const marqueeSpeed = Math.max(40, Math.min(300, marq?.speed ?? 90)); // px/s

  /** ===== 房間卡片定義（可擴充） ===== */
  const rooms = [
    { code: "R30", name: "百家樂 R30", desc: "30 秒節奏，快感十足", gradient: "from-cyan-400/20 to-cyan-200/0" },
    { code: "R60", name: "百家樂 R60", desc: "經典 60 秒節奏", gradient: "from-violet-400/20 to-violet-200/0" },
    { code: "R90", name: "百家樂 R90", desc: "穩健 90 秒節奏", gradient: "from-rose-400/20 to-rose-200/0" },
  ];

  /** ===== 登出 ===== */
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/auth");
  };

  /** ===== 在線數（若無 API 可隱藏） ===== */
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/online", { cache: "no-store" });
        const j = await r.json();
        if (alive && r.ok) setOnline(j?.count ?? null);
      } catch {}
    })();
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/online", { cache: "no-store" });
        const j = await r.json();
        if (alive && r.ok) setOnline(j?.count ?? null);
      } catch {}
    }, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  /** ===== 渲染 ===== */
  return (
    <div className="min-h-screen bg-casino-bg text-white overflow-x-hidden">
      {/* 宇宙星雲背景層（CSS 於 globals.css） */}
      <div className="cosmic-sky pointer-events-none" />
      <div className="cosmic-sky nebula" />
      <div className="cosmic-particles" />

      {/* 頂部工具列 */}
      <header className="max-w-7xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-extrabold tracking-wider">
            TOPZ <span className="opacity-75">CASINO</span>
          </div>
          {online != null && (
            <span className="ml-3 text-xs opacity-80 glass px-2 py-1 rounded-lg">
              在線玩家：{online}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 主題開關 */}
          <button
            onClick={() => {
              playClick();
              toggleTheme();
            }}
            className="px-3 py-2 rounded-xl border border-white/15 hover:border-white/30 transition glass"
            title="切換主題"
          >
            {theme === "dark" ? "🌙 深色" : "🌤️ 淺色"}
          </button>

          {/* 現在時間 */}
          <div className="glass px-3 py-2 rounded-xl">
            <div className="text-[10px] opacity-70">現在時間</div>
            <div className="text-sm font-semibold">{nowStr}</div>
          </div>

          {/* 個人資訊（錢包會即時更新） */}
          <div className="glass px-3 py-2 rounded-xl">
            <div className="text-[10px] opacity-70">玩家</div>
            <div className="text-sm font-semibold">
              {me?.name ?? me?.email ?? "未登入"}
            </div>
          </div>
          <div className="glass px-3 py-2 rounded-xl">
            <div className="text-[10px] opacity-70">錢包餘額</div>
            <div className="text-sm font-bold tabular-nums">{me?.balance ?? "—"}</div>
          </div>
          <div className="glass px-3 py-2 rounded-xl">
            <div className="text-[10px] opacity-70">銀行餘額</div>
            <div className="text-sm font-bold tabular-nums">{me?.bankBalance ?? "—"}</div>
          </div>

          {/* 銀行 / 管理 / 登出 */}
          <Link
            href="/bank"
            onClick={playClick}
            className="px-3 py-2 rounded-xl border border-white/15 hover:border-white/30 transition glass"
          >
            🏦 銀行
          </Link>
          {me?.isAdmin && (
            <Link
              href="/admin"
              onClick={playClick}
              className="px-3 py-2 rounded-xl border border-white/15 hover:border-white/30 transition glass"
            >
              🛠️ 後台
            </Link>
          )}
          <button
            onClick={() => {
              playClick();
              logout();
            }}
            className="px-3 py-2 rounded-xl border border-rose-400/40 hover:border-rose-300/70 transition glass"
          >
            ⎋ 登出
          </button>
        </div>
      </header>

      {/* 跑馬燈 */}
      {showMarquee && (
        <div className="relative z-10">
          <div
            className="marquee-container mx-auto mt-3"
            style={
              {
                "--marquee-speed": `${marqueeSpeed}s`,
              } as React.CSSProperties
            }
          >
            <div className="marquee-track">
              <span>{marq!.text}</span>
              <span aria-hidden>{marq!.text}</span>
              <span aria-hidden>{marq!.text}</span>
            </div>
          </div>
        </div>
      )}

      {/* 主體：簽到 + 公告 + 房間區塊 */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左側：簽到卡 + 公告卡 */}
          <section className="lg:col-span-1 space-y-6">
            {/* ✅ 每日簽到卡片 */}
            <CheckinCard />

            {/* 公告欄（保留原有） */}
            <div className="glass rounded-2xl p-5 border border-white/15 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">📢 公告欄</h2>
                <span className="text-xs opacity-70">最新訊息</span>
              </div>
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {anns.length > 0 ? (
                  anns.map((a) => (
                    <article
                      key={a.id}
                      className={clsx(
                        "rounded-xl p-3 border",
                        a.isPinned
                          ? "border-amber-300/50 bg-amber-200/5"
                          : "border-white/10 bg-white/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {a.isPinned ? "📌 " : ""}
                          {a.title}
                        </h3>
                        <time className="text-[10px] opacity-60">
                          {new Date(a.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <p className="text-sm opacity-90 mt-1 whitespace-pre-wrap">
                        {a.content}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="opacity-70 text-sm">目前功能都還在擴充當中。請各位耐心等候。</div>
                )}
              </div>
            </div>
          </section>

          {/* 右側：房間卡（可擴充） */}
          <section className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((r) => (
                <button
                  key={r.code}
                  onClick={() => {
                    playClick();
                    router.push(`/casino/baccarat/${r.code}`);
                  }}
                  className={clsx(
                    "group relative overflow-hidden rounded-2xl p-5",
                    "border border-white/15 hover:border-white/35 transition",
                    "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,.06),rgba(255,255,255,.02)_60%)]",
                    "shadow-[0_10px_30px_rgba(0,0,0,.35)]"
                  )}
                >
                  {/* 角落光暈 */}
                  <div
                    className={clsx(
                      "absolute -inset-1 opacity-0 group-hover:opacity-100 transition",
                      "bg-gradient-to-br",
                      r.gradient
                    )}
                  />
                  <div className="relative z-10">
                    <div className="text-xs opacity-70">{r.code}</div>
                    <div className="text-xl font-extrabold tracking-wide">{r.name}</div>
                    <div className="opacity-80 text-sm mt-1">{r.desc}</div>
                    <div className="mt-4 flex items-center gap-2 text-xs opacity-75">
                      <span className="inline-block px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                        百家樂
                      </span>
                      <span className="inline-block px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                        宇宙牌局
                      </span>
                    </div>
                  </div>
                  {/* 底部流光 */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 glow-bar" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* 底部音效（click） */}
      <audio ref={clickSnd} src="/sounds/click.mp3" preload="auto" />

      {/* 版權或頁尾 */}
      <footer className="max-w-7xl mx-auto px-4 pb-10 pt-6 opacity-70 text-xs relative z-10">
        © {new Date().getFullYear()} TOPZ Casino. All rights reserved.
      </footer>

      {/* Tawk.to 客服（afterInteractive，不影響水合） */}
      <Script id="tawk-to" strategy="afterInteractive">{`
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        (function(){
          var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;
          s1.src='https://embed.tawk.to/68b349c7d19aeb19234310df/1j3u5gcnb';
          s1.charset='UTF-8';
          s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);
        })();
      `}</Script>
    </div>
  );
}
