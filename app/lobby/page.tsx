// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MeResp = {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    balance: number;
    bankBalance: number;
    isAdmin: boolean;
  };
};

type Outcome = "PLAYER" | "BANKER" | "TIE" | null;
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: { code: string; name: string; durationSeconds: number };
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Outcome; p: number | null; b: number | null };
};

const zhOutcome: Record<Exclude<Outcome, null>, string> = {
  PLAYER: "閒",
  BANKER: "莊",
  TIE: "和",
};
const zhPhase: Record<Phase, string> = {
  BETTING: "下注中",
  REVEALING: "開牌中",
  SETTLED: "已結算",
};

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function LobbyPage() {
  // 深/淺色切換
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  // 使用者資料
  const [me, setMe] = useState<MeResp | null>(null);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const j = (await r.json()) as MeResp;
        if (live && r.ok) setMe(j);
      } catch {}
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  // 房間狀態（R30/R60/R90）
  const roomCodes = ["R30", "R60", "R90"];
  const [states, setStates] = useState<Record<string, StateResp | null>>({
    R30: null,
    R60: null,
    R90: null,
  });
  useEffect(() => {
    let live = true;
    async function loadAll() {
      try {
        const arr = await Promise.all(
          roomCodes.map(async (code) => {
            const r = await fetch(`/api/casino/baccarat/state?room=${code}`, {
              credentials: "include",
              cache: "no-store",
            });
            const j = (await r.json()) as StateResp | { error?: string };
            if (!r.ok) return [code, null] as const;
            return [code, j as StateResp] as const;
          })
        );
        if (!live) return;
        const next: Record<string, StateResp | null> = { R30: null, R60: null, R90: null };
        for (const [code, st] of arr) next[code] = st;
        setStates(next);
      } catch {}
    }
    loadAll();
    const t = setInterval(loadAll, 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  // 跑馬燈（可改成從 /api/admin/announcements 撈）
  const marquee =
    "🔥 系統公告：維護時段 03:00–03:10；活動【連勝加碼】進行中！祝您遊戲愉快～ ✨";

  const now = useNow();
  const nowStr = useMemo(() => {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [now]);

  // 音效（僅保留按鍵音；最底部控制）
  const [muted, setMuted] = useState(false);
  function playClick() {
    if (muted) return;
    const a = new Audio("/sounds/click.mp3");
    a.volume = 0.6;
    a.play().catch(() => {});
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-light dark:bg-space-dark transition-colors duration-500">
      {/* 背景宇宙圖層 */}
      <CosmicBackdrop />

      {/* 頂部列：公告 & 主操作 */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 pt-6">
        {/* 公告跑馬燈 */}
        <div className="glass2 rounded-2xl border border-white/10 overflow-hidden">
          <div className="bg-gradient-to-r from-fuchsia-500/20 via-cyan-400/10 to-amber-300/20 h-[44px]">
            <div className="marquee text-sm px-4">
              <span className="opacity-90">{marquee}</span>
              <span className="mx-8">•</span>
              <span className="opacity-90">{marquee}</span>
            </div>
          </div>
        </div>

        {/* 上方功能帶：個人資訊 / 時間 / 主題切換 / 銀行 / 管理 / 登出 */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          {/* 個人/時間 */}
          <div className="glass2 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="avatar-glow">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400/60 to-fuchsia-400/60 ring-2 ring-white/20" />
                </div>
                <div>
                  <div className="text-sm opacity-70">歡迎回來</div>
                  <div className="text-lg font-bold">
                    {me?.user?.name || me?.user?.email || "未登入"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoPill title="錢包" value={me?.user ? `${me.user.balance}` : "—"} emphasis />
                <InfoPill title="銀行" value={me?.user ? `${me.user.bankBalance}` : "—"} />
              </div>

              <div className="hidden md:flex items-center gap-3">
                <InfoPill title="時間" value={nowStr} />
                <button
                  onClick={() => {
                    playClick();
                    toggleTheme();
                  }}
                  className="btn-ghost"
                  title="切換深/淺色"
                >
                  {theme === "dark" ? "🌞" : "🌙"}
                </button>
              </div>
            </div>
          </div>

          {/* 快捷：銀行 / 管理 / 登出 */}
          <div className="grid grid-cols-3 gap-4">
            <Link href="/bank" className="tool-card group">
              <div className="tool-card-bg from-cyan-400/40 to-sky-300/40" />
              <div className="tool-card-inner">
                <div className="text-2xl">🏦</div>
                <div className="font-semibold">銀行</div>
                <div className="text-xs opacity-70">轉出入 / 刷新資金</div>
              </div>
            </Link>

            {me?.user?.isAdmin ? (
              <Link href="/admin" className="tool-card group">
                <div className="tool-card-bg from-fuchsia-400/40 to-indigo-400/40" />
                <div className="tool-card-inner">
                  <div className="text-2xl">🛠️</div>
                  <div className="font-semibold">管理後台</div>
                  <div className="text-xs opacity-70">公告 / 發幣 / 房間控制</div>
                </div>
              </Link>
            ) : (
              <div className="tool-card disabled">
                <div className="tool-card-bg from-gray-400/30 to-gray-300/30" />
                <div className="tool-card-inner">
                  <div className="text-2xl">🔒</div>
                  <div className="font-semibold">管理後台</div>
                  <div className="text-xs opacity-60">限管理員</div>
                </div>
              </div>
            )}

            <form action="/api/auth/logout" method="post" className="tool-card group">
              <div className="tool-card-bg from-rose-400/40 to-orange-300/40" />
              <button className="tool-card-inner w-full h-full" onClick={playClick}>
                <div className="text-2xl">🚪</div>
                <div className="font-semibold">登出</div>
                <div className="text-xs opacity-70">返回登入頁</div>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* 房間卡片區 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-24">
        <h2 className="text-xl font-semibold mb-3 opacity-90">🎴 百家樂房間</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {roomCodes.map((code) => {
            const st = states[code];
            return (
              <Link key={code} href={`/casino/baccarat/${code}`} className="room-card group">
                <div className="room-card-bg" />
                <div className="room-card-aurora aurora-1" />
                <div className="room-card-aurora aurora-2" />
                <div className="room-card-aurora aurora-3" />

                <div className="relative z-10 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold tracking-wide">
                      {st?.room?.name || code}
                    </div>
                    <span className="phase-chip">
                      {st ? zhPhase[st.phase] : "載入中"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <InfoPillSmall title="局序" value={st ? pad4(st.roundSeq) : "--"} />
                    <InfoPillSmall title="倒數" value={st ? `${st.secLeft}s` : "--"} />
                    <InfoPillSmall
                      title="結果"
                      value={
                        st?.result?.outcome
                          ? zhOutcome[st.result.outcome]
                          : st?.phase === "REVEALING"
                          ? "開牌中…"
                          : "—"
                      }
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="text-xs opacity-80">
                      {st?.result
                        ? `閒 ${st.result.p ?? 0} / 莊 ${st.result.b ?? 0}`
                        : "等待結束下注…"}
                    </div>
                    <span className="enter-chip group-active:scale-95">進入 ➜</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* 底部：音效總開關 */}
      <footer className="fixed bottom-3 inset-x-0 z-20 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4">
          <div className="pointer-events-auto glass2 rounded-full px-4 py-2 inline-flex items-center gap-3 border border-white/10">
            <span className="text-sm opacity-80">音效</span>
            <button
              onClick={() => setMuted((m) => !m)}
              className="btn-ghost"
              title="切換音效"
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===== 小元件 ===== */

function InfoPill({ title, value, emphasis = false }: { title: string; value: any; emphasis?: boolean }) {
  return (
    <div
      className={`px-3 py-2 rounded-xl border backdrop-blur-md ${
        emphasis
          ? "border-emerald-300/40 bg-emerald-400/10"
          : "border-white/15 bg-white/5 dark:bg-white/5"
      }`}
    >
      <div className="text-[11px] opacity-70">{title}</div>
      <div className="text-base font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function InfoPillSmall({ title, value }: { title: string; value: any }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md">
      <div className="text-[10px] opacity-70">{title}</div>
      <div className="text-sm font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function CosmicBackdrop() {
  return (
    <>
      {/* 星野 */}
      <div className="pointer-events-none absolute inset-0 bg-stars opacity-60 dark:opacity-90" />
      {/* 旋轉星雲 */}
      <div className="pointer-events-none absolute -top-1/3 -left-1/3 w-[80vmax] h-[80vmax] nebula nebula-cyan" />
      <div className="pointer-events-none absolute -bottom-1/2 -right-1/4 w-[70vmax] h-[70vmax] nebula nebula-fuchsia" />
      <div className="pointer-events-none absolute top-1/3 -right-1/3 w-[60vmax] h-[60vmax] nebula nebula-amber" />
      {/* 漂浮粒子 */}
      <div className="pointer-events-none absolute inset-0 particle-layer" />
    </>
  );
}
