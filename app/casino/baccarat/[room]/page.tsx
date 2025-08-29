"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import FlipTile from "@/components/FlipTile";

type Outcome = "PLAYER" | "BANKER" | "TIE" | null;

type RoomState = {
  room: { code: "R30" | "R60" | "R90"; name: string; durationSeconds: number };
  day: string;
  roundId: string;
  roundSeq: number;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  secLeft: number;
  result:
    | {
        outcome: Outcome;
        p: number | null;
        b: number | null;
      }
    | null;
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
};

export default function RoomPage() {
  const router = useRouter();
  const { room } = useParams<{ room: string }>();
  const [data, setData] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);

  // 輪詢房間狀態
  useEffect(() => {
    let alive = true;
    async function tick() {
      const r = await fetch(`/api/casino/baccarat/state?room=${room}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json()) as RoomState;
      if (!r.ok) {
        // 未登入導回 /auth
        if ((j as any)?.error?.includes?.("登入")) router.push("/auth");
        return;
      }
      if (alive) {
        setData(j);
        setLoading(false);
      }
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [room, router]);

  const outcome: Outcome = data?.result?.outcome ?? null;
  const pVal = data?.result?.p ?? null;
  const bVal = data?.result?.b ?? null;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        載入中…
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        讀取失敗，請重試
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 text-white bg-gradient-to-br from-black via-purple-900 to-blue-900">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 房間資訊 */}
        <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm opacity-75">{data.room.name}（{data.room.code}）</div>
            <div className="text-lg font-semibold">
              局序 #{String(data.roundSeq).padStart(4, "0")}
            </div>
            <div className="text-sm">
              狀態：{data.phase === "BETTING" ? "下注中" : data.phase === "REVEALING" ? "開牌中" : "已結算"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">倒數</div>
            <div className="text-3xl font-bold tabular-nums">{data.secLeft}s</div>
          </div>
        </div>

        {/* 翻牌動畫 */}
        {data.phase !== "BETTING" && data.result && (
          <div className="grid grid-cols-2 gap-6 w-full max-w-xl mx-auto">
            <FlipTile label="PLAYER" value={pVal} outcome={outcome} />
            <FlipTile label="BANKER" value={bVal} outcome={outcome} />
          </div>
        )}

        {/* 我的投注（簡版） */}
        <div className="glass rounded-xl p-4">
          <div className="font-semibold mb-3">我的投注</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {["PLAYER", "BANKER", "TIE"].map((s) => (
              <div key={s} className="glass rounded p-3 flex items-center justify-between">
                <span>{s}</span>
                <span className="font-bold">{data.myBets?.[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 近20局路子（簡版） */}
        <div className="glass rounded-xl p-4">
          <div className="font-semibold mb-3">近局結果</div>
          <div className="flex flex-wrap gap-2">
            {data.recent?.map((r) => (
              <div key={r.roundSeq} className="px-2 py-1 rounded text-xs glass">
                #{r.roundSeq}：
                <span className={
                  r.outcome === "PLAYER" ? "text-cyan-300" :
                  r.outcome === "BANKER" ? "text-rose-300" :
                  "text-amber-300"
                }>
                  {r.outcome ?? "-"}
                </span>
                <span className="opacity-70">（P{r.p}/B{r.b}）</span>
              </div>
            ))}
          </div>
        </div>

        {/* 返回大廳 */}
        <div className="text-center">
          <a href="/lobby" className="btn inline-block">返回大廳</a>
        </div>
      </div>
    </main>
  );
}
