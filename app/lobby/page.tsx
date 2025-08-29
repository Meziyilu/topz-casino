// app/lobby/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Me = { id: string; email: string; isAdmin: boolean } | null;

export default function LobbyPage() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [muted, setMuted] = useState(false);
  const clickSnd = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 預載點擊音
    clickSnd.current = new Audio("/sounds/click.mp3");
    clickSnd.current.preload = "auto";
    clickSnd.current.volume = 0.5;

    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "取得使用者資訊失敗");
        if (mounted) setMe(json?.user ?? null);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "取得使用者資訊失敗");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function playClick() {
    if (muted) return;
    clickSnd.current?.currentTime && (clickSnd.current.currentTime = 0);
    clickSnd.current?.play().catch(() => {});
  }

  async function logout() {
    try {
      playClick();
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    } finally {
      window.location.href = "/auth";
    }
  }

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      {/* 跑馬燈 */}
      <div className="w-full bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2 overflow-hidden relative">
          <div className="whitespace-nowrap animate-[shimmer_10s_linear_infinite]">
            🎉 TOPZCASINO 系統公告：祝您手氣長紅！維運正常、請理性娛樂。🎲💎
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            📢 百家樂三間房（30s / 60s / 90s）輪轉中，下注請把握倒數時間！
          </div>
        </div>
      </div>

      {/* 頁首 */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="text-2xl font-extrabold tracking-wider">TOPZCASINO</div>
        <div className="flex items-center gap-3">
          <button
            className={`btn glass tilt ${muted ? "opacity-70" : ""}`}
            onClick={() => setMuted((m) => !m)}
            title={muted ? "已靜音" : "點擊靜音 / 取消靜音"}
          >
            {muted ? "🔇 靜音" : "🔊 聲音"}
          </button>
          {!loading && me ? (
            <>
              <span className="opacity-80 text-sm">您好，{me.email}</span>
              <button onClick={logout} className="btn glass tilt">登出</button>
            </>
          ) : (
            <Link href="/auth" className="btn glass tilt" onClick={playClick}>登入 / 註冊</Link>
          )}
        </div>
      </div>

      {/* 卡片區 */}
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-6 pb-16">
        <RoomCard code="R30" name="30 秒房" href="/casino/baccarat/R30" onClick={playClick} />
        <RoomCard code="R60" name="60 秒房" href="/casino/baccarat/R60" onClick={playClick} />
        <RoomCard code="R90" name="90 秒房" href="/casino/baccarat/R90" onClick={playClick} />

        {/* 銀行 */}
        <div className="glass glow-ring room-card hover:animate-[pulse-border_2.4s_ease-in-out_infinite]">
          <div className="p-5">
            <div className="text-xl font-bold mb-2">銀行錢包</div>
            <div className="opacity-80 mb-4 text-sm">
              存、提、銀行⇄錢包 轉帳管理。
            </div>
            <Link href="/bank" className="btn shimmer" onClick={playClick}>進入銀行</Link>
          </div>
        </div>

        {/* 管理員面板 */}
        <div className="glass glow-ring room-card hover:animate-[pulse-border_2.4s_ease-in-out_infinite]">
          <div className="p-5">
            <div className="text-xl font-bold mb-2">管理員面板</div>
            <div className="opacity-80 mb-4 text-sm">
              使用者查詢 / 錢包調整 / 房間重啟等工具。
            </div>
            <Link href="/admin" className="btn shimmer" onClick={playClick}>開啟後台</Link>
          </div>
        </div>

        {/* 登出卡片（保留） */}
        <div className="glass glow-ring room-card hover:animate-[pulse-border_2.4s_ease-in-out_infinite]">
          <div className="p-5">
            <div className="text-xl font-bold mb-2">帳號</div>
            <div className="opacity-80 mb-4 text-sm">
              切換帳號或安全登出系統。
            </div>
            <button onClick={logout} className="btn shimmer">登出</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomCard({
  code,
  name,
  href,
  onClick,
}: {
  code: string;
  name: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="glass glow-ring room-card block hover:scale-[1.03] transition-transform duration-200"
    >
      <div className="p-5">
        <div className="text-xs opacity-70 mb-1">房間 {code}</div>
        <div className="text-xl font-bold">{name}</div>
        <div className="opacity-80 text-sm mt-2">進入下注，跟著倒數上車！</div>
      </div>
    </Link>
  );
}
