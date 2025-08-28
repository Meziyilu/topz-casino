"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store", credentials: "include" }).then((r) => r.json());

const ROOMS = [
  { code: "R30", name: "30秒房" },
  { code: "R60", name: "60秒房" },
  { code: "R90", name: "90秒房" },
] as const;

export default function LobbyPage() {
  return (
    <div className="min-h-[100dvh] p-6 md:p-10 text-white bg-gradient-to-b from-[#0a0f1a] to-[#0b1020]">
      {/* 內嵌一些通用樣式（可與你現有 CSS 共存） */}
      <style jsx global>{`
        .glass-panel {
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
          border: 1px solid rgba(255,255,255,.15);
          backdrop-filter: blur(12px);
        }
        .btn {
          padding: 10px 14px; border-radius: 12px; font-weight: 700;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.2);
          transition: transform .05s ease, background .2s ease;
        }
        .btn:hover { background: rgba(255,255,255,.16); }
        .btn:active { transform: scale(.98); }
        .btn-primary {
          background: linear-gradient(180deg, #22c55e, #16a34a);
          border-color: rgba(0,0,0,.2);
          color: #0a0f1a;
        }
        .pill { padding: 4px 10px; border-radius: 999px; font-size: 12px;
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">TOPZCASINO 大廳</h1>
            <p className="opacity-70 mt-2 text-sm">選擇房間進入百家樂。資料每秒即時更新。</p>
          </div>
          <Link href="/casino/bank" className="btn">銀行 / 錢包</Link>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROOMS.map((r) => (
            <RoomCard key={r.code} code={r.code} displayName={r.name} />
          ))}
        </section>
      </div>
    </div>
  );
}

function RoomCard({ code, displayName }: { code: string; displayName: string }) {
  const { data, error } = useSWR(
    `/api/casino/baccarat/state?room=${code}`,
    fetcher,
    { refreshInterval: 1000, dedupingInterval: 500, revalidateOnFocus: false }
  );

  const phase =
    data?.phase === "BETTING" ? "下注中" :
    data?.phase === "REVEAL"  ? "開牌中" :
    data?.phase === "SETTLED" ? "已結算" : "-";

  const seq = data?.roundSeq ?? 0;
  const secLeft = data?.secLeft ?? 0;
  const dur = data?.room?.durationSeconds ?? (code === "R30" ? 30 : code === "R90" ? 90 : 60);

  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-70">{displayName}</div>
          <div className="text-2xl font-extrabold tracking-wide">房間 {code}</div>
        </div>
        <div className="pill">{error ? "連線異常" : "即時更新"}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-1">
        <KV label="局長" value={`${dur}s`} />
        <KV label="局序" value={String(seq).padStart(4, "0")} />
        <KV label="狀態" value={phase} />
        <KV label="倒數" value={`${secLeft}s`} />
      </div>

      {/* 路子縮略（今日近 6 局） */}
      <div>
        <div className="text-xs opacity-70 mb-2">路子（近 6 局）</div>
        <div className="flex flex-wrap gap-2">
          {(data?.recent ?? []).slice(0, 6).map((r: any) => (
            <span key={r.roundSeq} className="pill">
              #{r.roundSeq}:{r.outcome}
            </span>
          ))}
          {(!data?.recent || data.recent.length === 0) && (
            <span className="opacity-50 text-sm">尚無</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-auto">
        <Link href={`/casino/baccarat/${code}`} className="btn btn-primary">
          進入房間
        </Link>
        <Link href={`/casino/baccarat/${code}`} className="btn">
          觀戰
        </Link>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 border border-white/15">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
