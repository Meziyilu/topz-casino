// app/lobby/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Me = {
  id: string;
  email: string;
  name?: string | null;
  isAdmin: boolean;
  balance: number;
  bankBalance: number;
} | null;

type StateResp = {
  room: { code: "R30" | "R60" | "R90"; name: string; durationSeconds: number };
  day: string;
  roundId: string;
  roundSeq: number;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  secLeft: number;
} | null;

const ROOMS: Array<{ code: "R30" | "R60" | "R90"; name: string }> = [
  { code: "R30", name: "30秒房" },
  { code: "R60", name: "60秒房" },
  { code: "R90", name: "90秒房" },
];

export default function LobbyPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [states, setStates] = useState<Record<string, StateResp>>({});

  // 時鐘（台北時間顯示）
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = useMemo(() => {
    try {
      return clock.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    } catch {
      return clock.toLocaleString();
    }
  }, [clock]);

  // 取得登入者
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (!data?.id) {
          router.replace("/login");
          return;
        }
        setMe(data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // 輕量輪詢三個房的狀態（僅拿倒數與階段作展示）
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const next: Record<string, StateResp> = {};
        for (const r of ROOMS) {
          const res = await fetch(`/api/casino/baccarat/state?room=${r.code}`, {
            cache: "no-store",
          });
          next[r.code] = res.ok ? await res.json() : null;
        }
        if (!stop) setStates(next);
      } catch {}
      if (!stop) setTimeout(poll, 1000);
    }
    poll();
    return () => {
      stop = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-gradient-to-br from-slate-950 via-zinc-900 to-black text-zinc-300">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-black">
      {/* 背景光暈 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl animate-pulse"></div>
      </div>

      {/* 頂部導覽 */}
      <header className="sticky top-0 z-10">
        <div className="backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-300 to-yellow-400 shadow"></div>
              <div className="text-lg font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400">
                TOPZCASINO
              </div>
            </div>
            <div className="text-xs md:text-sm text-zinc-300">{timeStr}（台北）</div>
          </div>
        </div>
      </header>

      {/* 內容區 */}
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        {/* 使用者 / 錢包卡 */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-400">歡迎回來</div>
                <div className="text-xl font-semibold text-white">
                  {me?.name || me?.email}
                </div>
              </div>
              <Link
                href="/bank"
                className="rounded-lg bg-emerald-400/90 text-black font-semibold px-4 py-2 hover:bg-emerald-300 transition"
              >
                前往銀行
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="text-xs text-zinc-400">錢包餘額</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {Number(me?.balance || 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="text-xs text-zinc-400">銀行餘額</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {Number(me?.bankBalance || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 管理員工具入口 */}
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
            <div className="text-sm text-zinc-400">快速操作</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {me?.isAdmin ? (
                <>
                  <Link
                    href="/admin"
                    className="rounded-lg bg-cyan-400/90 text-black px-3 py-2 font-semibold hover:bg-cyan-300 transition"
                  >
                    管理員面板
                  </Link>
                  <Link
                    href="/admin?tab=rooms"
                    className="rounded-lg bg-amber-300/90 text-black px-3 py-2 font-semibold hover:bg-amber-200 transition"
                  >
                    房間管理
                  </Link>
                </>
              ) : (
                <span className="text-zinc-400 text-sm">您目前非管理員</span>
              )}
            </div>
          </div>
        </section>

        {/* 百家樂房間卡 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">百家樂</h3>
            <div className="text-xs text-zinc-400">選擇一個房間開始遊戲</div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {ROOMS.map((r) => {
              const st = states[r.code];
              const phase =
                st?.phase === "BETTING"
                  ? "下注中"
                  : st?.phase === "REVEALING"
                  ? "開牌中"
                  : st?.phase === "SETTLED"
                  ? "已結算"
                  : "—";
              const sec = typeof st?.secLeft === "number" ? st?.secLeft : "—";
              const seq = st?.roundSeq ?? "—";

              return (
                <Link
                  key={r.code}
                  href={`/casino/baccarat/${r.code}`}
                  className="group block rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 hover:border-emerald-300/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-zinc-300">{r.name}</div>
                      <div className="text-xl font-bold text-white mt-0.5">
                        房間 {r.code}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 shadow-inner opacity-90 group-hover:opacity-100 transition"></div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-black/30 px-2 py-2 border border-white/10">
                      <div className="text-[11px] text-zinc-400">局序</div>
                      <div className="text-base text-white font-semibold">{seq}</div>
                    </div>
                    <div className="rounded-lg bg-black/30 px-2 py-2 border border-white/10">
                      <div className="text-[11px] text-zinc-400">狀態</div>
                      <div className="text-base text-white font-semibold">{phase}</div>
                    </div>
                    <div className="rounded-lg bg-black/30 px-2 py-2 border border-white/10">
                      <div className="text-[11px] text-zinc-400">倒數</div>
                      <div className="text-base text-white font-semibold">{sec}s</div>
                    </div>
                  </div>

                  <div className="mt-4 text-right">
                    <span className="inline-block rounded-lg bg-emerald-400/90 text-black text-sm font-semibold px-4 py-1.5 group-hover:bg-emerald-300 transition">
                      立即進入
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
