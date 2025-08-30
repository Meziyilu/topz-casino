// app/lobby/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ---- types ---- */
type MeResp = {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    balance: number;
    bankBalance?: number;
    isAdmin?: boolean;
  };
};

type MarqueeItem = {
  id: string;
  text: string;
  isActive: boolean;
  createdAt?: string;
};

type RoomCard = {
  code: "R30" | "R60" | "R90" | string;
  title: string;
  desc: string;
  sec: number;
};

function formatTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function LobbyPage() {
  const router = useRouter();

  // --- 現在時間 ---
  const [nowStr, setNowStr] = useState(formatTime());
  useEffect(() => {
    const t = setInterval(() => setNowStr(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // --- 個人資訊（/api/auth/me 輪詢）---
  const [me, setMe] = useState<MeResp["user"] | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const j = (await r.json()) as MeResp;
        if (!alive) return;
        if (r.ok) setMe(j.user ?? null);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // --- 跑馬燈（/api/admin/marquee）---
  const [marquee, setMarquee] = useState<MarqueeItem[]>([]);
  useEffect(() => {
    let alive = true;
    async function loadMarquee() {
      try {
        const r = await fetch("/api/admin/marquee", { cache: "no-store", credentials: "include" });
        // 未登入或未實作 API 時，容錯
        if (!alive) return;
        if (r.ok) {
          const j = await r.json();
          const rows = (Array.isArray(j) ? j : j?.items) as MarqueeItem[] | undefined;
          setMarquee((rows ?? []).filter((x) => x?.text && (x.isActive ?? true)));
        } else {
          // fallback
          setMarquee([
            { id: "1", text: "歡迎來到 TOPZ Casino，祝您手氣旺！", isActive: true },
            { id: "2", text: "新手禮包即將開放，敬請期待～", isActive: true },
          ]);
        }
      } catch {
        if (!alive) return;
        setMarquee([
          { id: "1", text: "歡迎來到 TOPZ Casino，祝您手氣旺！", isActive: true },
        ]);
      }
    }
    loadMarquee();
    const t = setInterval(loadMarquee, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // --- 房卡（可擴充）---
  const rooms: RoomCard[] = useMemo(
    () => [
      { code: "R30", title: "快速廳 R30", desc: "每局 30 秒，節奏明快", sec: 30 },
      { code: "R60", title: "經典廳 R60", desc: "每局 60 秒，最受歡迎", sec: 60 },
      { code: "R90", title: "沉浸廳 R90", desc: "每局 90 秒，觀戰更從容", sec: 90 },
    ],
    []
  );

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/auth");
  }

  const isAdmin = !!me?.isAdmin;

  return (
    <div className="min-h-screen text-white nebula-wrap">
      {/* 跑馬燈 */}
      <div className="py-2 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <Marquee messages={marquee.length ? marquee.map((m) => m.text) : ["歡迎光臨 TOPZ Casino"]} />
        </div>
      </div>

      {/* 頂部工具列：時間 / 主題切換 / 我的資訊 / 銀行 / 後台 / 登出 */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左：現在時間 + 主題切換提示（主題切換按鈕在 layout 的右上角；這邊只展示時間） */}
        <div className="glass glow-ring rounded-2xl p-4 flex items-center justify-between">
          <div className="text-sm opacity-80">現在時間</div>
          <div className="text-2xl font-bold tracking-widest">{nowStr}</div>
        </div>

        {/* 中：我的資訊 */}
        <div className="glass glow-ring rounded-2xl p-4 grid grid-cols-3 gap-3">
          <InfoMini title="帳號" value={me?.name || me?.email || "—"} />
          <InfoMini title="錢包" value={typeof me?.balance === "number" ? `${me?.balance}` : "—"} />
          <InfoMini title="身分" value={isAdmin ? "管理員" : "一般會員"} />
        </div>

        {/* 右：功能快捷 */}
        <div className="glass glow-ring rounded-2xl p-4 flex gap-3 justify-end">
          <button
            className="btn sheen"
            onClick={() => router.push("/bank")}
            title="銀行錢包"
          >
            🏦 銀行
          </button>
          {isAdmin && (
            <button className="btn sheen" onClick={() => router.push("/admin")} title="管理後台">
              🛠 管理後台
            </button>
          )}
          <button className="btn sheen" onClick={logout} title="登出">
            ⎋ 登出
          </button>
        </div>
      </div>

      {/* 房間區塊 */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">遊戲房間</h2>
          <div className="text-sm opacity-70">後續可持續擴充新的房間樣式與遊戲</div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((r, idx) => (
            <RoomCardView
              key={r.code}
              room={r}
              onEnter={() => router.push(`/casino/baccarat/${r.code}`)}
              delay={idx * 80}
            />
          ))}

          {/* 預留一張「即將推出」占位卡，未來擴充用 */}
          <div
            className="glass rounded-2xl p-6 flex flex-col items-start justify-between animate-fadeUp"
            style={{ animationDelay: `${rooms.length * 80}ms` }}
          >
            <div>
              <div className="text-sm opacity-70">COMING SOON</div>
              <div className="text-2xl font-extrabold mt-1">全新玩法</div>
              <p className="opacity-80 mt-2 text-sm">
                我們正在準備更多房間與遊戲模式，敬請期待 ✨
              </p>
            </div>
            <div className="mt-6">
              <span className="px-3 py-1 rounded-full border border-white/20">開發中</span>
            </div>
          </div>
        </div>
      </div>

      {/* 本頁用到的跑馬燈 keyframes（局部注入，避免你全域 CSS 再改動） */}
      <style jsx global>{`
        @keyframes marqueeX {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/** -------- components -------- */

function Marquee({ messages }: { messages: string[] }) {
  const text = (messages.length ? messages : ["歡迎光臨"]).join("　•　");
  // 兩份內容銜接，做無縫水平滾動
  return (
    <div className="relative overflow-hidden glass rounded-xl border border-white/10">
      <div
        className="whitespace-nowrap py-2"
        style={{
          display: "flex",
          animation: "marqueeX 18s linear infinite",
        }}
      >
        <span className="px-4 opacity-90">{text}</span>
        <span className="px-4 opacity-90">{text}</span>
      </div>
    </div>
  );
}

function InfoMini({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-base font-bold truncate">{value}</div>
    </div>
  );
}

function RoomCardView({
  room,
  onEnter,
  delay = 0,
}: {
  room: RoomCard;
  onEnter: () => void;
  delay?: number;
}) {
  return (
    <div
      className="glass glow-ring rounded-2xl p-6 flex flex-col justify-between animate-fadeUp sheen"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <div className="text-sm opacity-70">Baccarat</div>
        <div className="text-2xl font-extrabold mt-1">{room.title}</div>
        <p className="opacity-80 mt-2 text-sm">{room.desc}</p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="px-3 py-1 rounded-full border border-white/20">
          每局 {room.sec}s
        </span>
        <button className="btn" onClick={onEnter} title="進入房間">
          進入
        </button>
      </div>
    </div>
  );
}
