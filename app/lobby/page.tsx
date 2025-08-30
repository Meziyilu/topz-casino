"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ---------- 型別 ---------- */
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type Outcome = "PLAYER" | "BANKER" | "TIE" | null;

type StateResp = {
  room: { code: string; name: string; durationSeconds: number };
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Outcome; p: number | null; b: number | null };
};

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

/** ---------- 小工具 ---------- */
const zhPhase: Record<Phase, string> = {
  BETTING: "下注中",
  REVEALING: "開牌中",
  SETTLED: "已結算",
};
const zhOutcome: Record<Exclude<Outcome, null>, string> = {
  PLAYER: "閒",
  BANKER: "莊",
  TIE: "和",
};
function fmtOutcome(o: Outcome) {
  return o ? zhOutcome[o] : "—";
}
function pad4(n: number) {
  return n.toString().padStart(4, "0");
}
function hhmmss(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** ---------- 主頁 ---------- */
export default function LobbyPage() {
  const router = useRouter();

  /** 主題（深/淺） */
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  /** 跑馬燈 / 公告 */
  const [marquees, setMarquees] = useState<string[]>([]);
  const [notices, setNotices] = useState<{ id: string; title: string; content?: string }[]>([]);

  /** 使用者資訊 */
  const [me, setMe] = useState<MeResp["user"] | null>(null);

  /** 三房狀態 */
  const roomCodes = ["R30", "R60", "R90"] as const;
  const [rooms, setRooms] = useState<Record<string, StateResp | null>>({
    R30: null,
    R60: null,
    R90: null,
  });

  /** 目前時間 */
  const [nowStr, setNowStr] = useState(hhmmss());

  /** 音效 */
  const [soundOn, setSoundOn] = useState(true);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  function playClick() {
    if (!soundOn) return;
    if (clickRef.current) {
      try {
        clickRef.current.currentTime = 0;
        clickRef.current.play();
      } catch {}
    }
  }

  /** 取使用者 */
  useEffect(() => {
    let live = true;
    async function loadMe() {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const j: MeResp = await r.json();
        if (live && r.ok) setMe(j.user ?? null);
      } catch {}
    }
    loadMe();
    const t = setInterval(loadMe, 5000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  /** 取跑馬燈 / 公告（若沒有對應 API 就用預設文案） */
  useEffect(() => {
    let live = true;
    async function loadMarqueeAndNotice() {
      try {
        const [m, n] = await Promise.allSettled([
          fetch("/api/admin/marquee", { cache: "no-store", credentials: "include" }),
          fetch("/api/admin/notice?limit=5", { cache: "no-store", credentials: "include" }),
        ]);

        if (live) {
          if (m.status === "fulfilled" && m.value.ok) {
            const j = await m.value.json();
            const arr = Array.isArray(j?.items)
              ? j.items.map((x: any) => String(x.text ?? x.title ?? "")).filter(Boolean)
              : [];
            setMarquees(arr.length ? arr : ["歡迎光臨 TOPZ CASINO，祝您中獎連連！"]);
          } else {
            setMarquees(["歡迎光臨 TOPZ CASINO，祝您中獎連連！"]);
          }

          if (n.status === "fulfilled" && n.value.ok) {
            const j = await n.value.json();
            const arr =
              Array.isArray(j?.items) && j.items.length
                ? j.items.map((x: any) => ({
                    id: String(x.id ?? crypto.randomUUID()),
                    title: String(x.title ?? "系統公告"),
                    content: String(x.content ?? ""),
                  }))
                : [];
            setNotices(arr);
          } else {
            setNotices([
              { id: "demo-1", title: "系統維護通知", content: "每日 05:00 例行維護 5 分鐘。" },
              { id: "demo-2", title: "防詐宣導", content: "切勿提供帳密給他人。" },
            ]);
          }
        }
      } catch {
        if (live) {
          setMarquees(["歡迎光臨 TOPZ CASINO，祝您中獎連連！"]);
          setNotices([{ id: "demo-1", title: "系統維護通知", content: "每日 05:00 例行維護 5 分鐘。" }]);
        }
      }
    }
    loadMarqueeAndNotice();
    const t = setInterval(loadMarqueeAndNotice, 15000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  /** 三房輪詢（每秒） */
  useEffect(() => {
    let live = true;
    async function loadOne(code: string) {
      const r = await fetch(`/api/casino/baccarat/state?room=${code}`, {
        cache: "no-store",
        credentials: "include",
      });
      const j = await r.json();
      if (live && r.ok) {
        setRooms((prev) => ({ ...prev, [code]: j as StateResp }));
      }
    }
    function tick() {
      roomCodes.forEach((c) => loadOne(c));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  /** 時鐘 */
  useEffect(() => {
    const t = setInterval(() => setNowStr(hhmmss()), 1000);
    return () => clearInterval(t);
  }, []);

  /** 登出 */
  async function logout() {
    playClick();
    try {
      const r = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (r.ok) router.push("/auth");
    } catch {
      router.push("/auth");
    }
  }

  /** UI：主題顏色 */
  const bgClass = theme === "light" ? "bg-[#f5f7fb] text-[#0A0A0A]" : "bg-casino-bg text-white";
  const cardGlass =
    theme === "light"
      ? "bg-white/80 backdrop-blur border border-black/10"
      : "glass"; // 你專案已有 .glass 的深色風格

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {/* 隱藏音效元素 */}
      <audio ref={clickRef} src="/sounds/click.mp3" preload="auto" />

      {/* 頂部：時間、錢包、主題切換、個資卡、登出 */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-3 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Badge title="目前時間" value={nowStr} light={theme === "light"} />
          <Badge
            title="錢包餘額"
            value={typeof me?.balance === "number" ? `${me!.balance}` : "—"}
            light={theme === "light"}
          />
          <Badge
            title="銀行餘額"
            value={typeof me?.bankBalance === "number" ? `${me!.bankBalance}` : "—"}
            light={theme === "light"}
          />
          {/* 主題切換 */}
          <button
            onClick={() => {
              playClick();
              setTheme((t) => (t === "dark" ? "light" : "dark"));
            }}
            className={`${cardGlass} rounded-xl px-4 py-2 text-sm hover:brightness-110 active:scale-95`}
            title="切換主題"
          >
            {theme === "light" ? "🌙 深色" : "☀️ 淺色"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={`${cardGlass} rounded-xl px-4 py-2`}>
            <div className="text-xs opacity-70">會員</div>
            <div className="font-semibold">{me?.name || me?.email || "訪客"}</div>
          </div>
          <button
            onClick={logout}
            className={`${cardGlass} rounded-xl px-4 py-2 hover:brightness-110 active:scale-95`}
            title="登出"
          >
            登出
          </button>
        </div>
      </div>

      {/* 跑馬燈 */}
      <div className={`${theme === "light" ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"} border-y py-2`}>
        <div className="overflow-hidden">
          <div className="marquee whitespace-nowrap">
            {marquees.length
              ? marquees.map((t, i) => (
                  <span key={i} className="mx-8 opacity-90">
                    📣 {t}
                  </span>
                ))
              : null}
          </div>
        </div>
      </div>

      {/* 主體：左房卡／右公告 + 銀行/管理入口 */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        {/* 房間卡（佔兩欄） */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomCodes.map((code) => (
            <RoomCard
              key={code}
              data={rooms[code]}
              code={code}
              light={theme === "light"}
              onClick={() => {
                playClick();
                router.push(`/casino/baccarat/${code}`);
              }}
            />
          ))}
        </div>

        {/* 右側欄：公告 + 銀行 + 管理後台 */}
        <div className="space-y-6">
          {/* 公告欄 */}
          <div className={`${cardGlass} rounded-2xl p-5`}>
            <div className="text-xl font-bold mb-3">公告欄</div>
            <div className="space-y-3">
              {notices.length ? (
                notices.map((n) => (
                  <div key={n.id} className={`${theme === "light" ? "border-black/10" : "border-white/10"} border-b pb-3 last:border-0`}>
                    <div className="font-semibold">{n.title}</div>
                    {n.content ? <div className="text-sm opacity-80 mt-1">{n.content}</div> : null}
                  </div>
                ))
              ) : (
                <div className="opacity-70 text-sm">暫無公告</div>
              )}
            </div>
          </div>

          {/* 銀行入口卡 */}
          <div className={`${cardGlass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">銀行</div>
              <button
                onClick={() => {
                  playClick();
                  router.push("/bank");
                }}
                className={`${theme === "light" ? "border-black/10" : "border-white/20"} border rounded-lg px-3 py-1 text-sm hover:brightness-110 active:scale-95`}
              >
                前往銀行 →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div className={`${cardGlass} rounded-lg p-3`}>
                <div className="opacity-70 text-xs">錢包餘額</div>
                <div className="text-lg font-bold">{typeof me?.balance === "number" ? me!.balance : "—"}</div>
              </div>
              <div className={`${cardGlass} rounded-lg p-3`}>
                <div className="opacity-70 text-xs">銀行餘額</div>
                <div className="text-lg font-bold">{typeof me?.bankBalance === "number" ? me!.bankBalance : "—"}</div>
              </div>
            </div>
          </div>

          {/* 管理後台（只有管理員看到） */}
          {me?.isAdmin && (
            <div className={`${cardGlass} rounded-2xl p-5`}>
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold">管理後台</div>
                <button
                  onClick={() => {
                    playClick();
                    router.push("/admin");
                  }}
                  className={`${theme === "light" ? "border-black/10" : "border-white/20"} border rounded-lg px-3 py-1 text-sm hover:brightness-110 active:scale-95`}
                >
                  進入後台 →
                </button>
              </div>
              <div className="opacity-80 text-sm mt-2">
                包含：發幣/扣幣、公告與跑馬燈、會員管理、交易紀錄、房間控制。
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右下角：音效開關（固定在最下面） */}
      <div className="fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={() => {
            playClick();
            setSoundOn((s) => !s);
          }}
          className={`${cardGlass} rounded-full px-4 py-2 text-sm hover:brightness-110 active:scale-95`}
          title="音效開關"
        >
          {soundOn ? "🔊 音效：開" : "🔈 音效：關"}
        </button>
      </div>

      {/* 本頁用到的簡單樣式 */}
      <style jsx>{`
        .marquee {
          display: inline-block;
          animation: marquee 18s linear infinite;
        }
        @keyframes marquee {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}

/** ---------- 小元件們 ---------- */
function Badge({
  title,
  value,
  light,
}: {
  title: string;
  value: string | number;
  light?: boolean;
}) {
  const box =
    light ? "bg-white/80 border border-black/10" : "glass";
  return (
    <div className={`${box} rounded-xl px-4 py-2`}>
      <div className="text-xs opacity-70">{title}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function RoomCard({
  code,
  data,
  onClick,
  light,
}: {
  code: string;
  data: StateResp | null;
  onClick: () => void;
  light?: boolean;
}) {
  const name = data?.room?.name ?? code;
  const phase = data?.phase ?? "BETTING";
  const seq = data?.roundSeq ?? 0;
  const secLeft = typeof data?.secLeft === "number" ? data!.secLeft : undefined;
  const result = data?.result;

  const phaseChip =
    phase === "BETTING"
      ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
      : phase === "REVEALING"
      ? "bg-amber-400/20 text-amber-700 border-amber-400/40"
      : "bg-sky-400/20 text-sky-700 border-sky-400/40";

  const cardGlass =
    light ? "bg-white/80 backdrop-blur border border-black/10" : "glass";

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left ${cardGlass} rounded-2xl p-5 hover:brightness-110 active:scale-[.99] transition`}
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">{name}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${phaseChip}`}>{zhPhase[phase]}</span>
      </div>
      <div className="mt-1 text-sm opacity-80">局序：{pad4(seq)}</div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-4xl font-extrabold tracking-wider">
          {typeof secLeft === "number" ? `${secLeft}s` : "—"}
        </div>
        <div className="text-right text-sm">
          <div className="opacity-70">上局結果</div>
          <div className="font-semibold">
            {result ? `${fmtOutcome(result.outcome)}（閒${result.p ?? 0}｜莊${result.b ?? 0}）` : "—"}
          </div>
        </div>
      </div>
    </button>
  );
}
