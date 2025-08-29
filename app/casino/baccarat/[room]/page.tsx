// app/casino/baccarat/[room]/page.tsx
"use client";

import NavBar from "@/components/NavBar";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import FlipTile from "@/components/FlipTile";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

type Side = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

export default function BaccaratRoomPage() {
  const params = useParams<{ room: string }>();
  const roomCode = String(params?.room || "R60").toUpperCase();

  const { data, mutate } = useSWR(
    `/api/casino/baccarat/state?room=${roomCode}`,
    fetcher,
    { refreshInterval: 1000 }
  );

  const [betAmt, setBetAmt] = useState(100);
  const [placing, setPlacing] = useState(false);
  const [flip, setFlip] = useState(false);

  // 根據 phase 切換翻牌動畫
  useEffect(() => {
    if (!data) return;
    setFlip(data.phase === "REVEALING" || data.phase === "SETTLED");
  }, [data?.phase]);

  async function place(side: Side) {
    if (!data) return;
    if (data.phase !== "BETTING" || data.secLeft <= 0) {
      alert("目前不能下注");
      return;
    }
    try {
      setPlacing(true);
      const r = await fetch(`/api/casino/baccarat/bet?room=${roomCode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: betAmt }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "下注失敗");
      mutate();
    } catch (e: any) {
      alert(e.message || "下注失敗");
    } finally {
      setPlacing(false);
    }
  }

  const recent: { roundSeq: number; outcome: string; p: number; b: number }[] =
    data?.recent ?? [];

  return (
    <main className="min-h-screen bg-casino-bg text-white">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 牌面 + 狀態 */}
        <div className="grid md:grid-cols-3 gap-4 items-center">
          <div className="card glass">
            <div className="text-white/70 text-sm">房間</div>
            <div className="text-xl font-bold">{data?.room?.name} ({data?.room?.code})</div>
            <div className="mt-2 text-sm text-white/80">
              局序：<b>{data?.roundSeq?.toString().padStart(4, "0")}</b>　狀態：<b>{data?.phase}</b>
            </div>
            <div className="mt-1 text-sm text-white/80">
              倒數：<b>{data?.secLeft ?? 0}s</b>
            </div>
          </div>

          <div className="card glass flex items-center justify-center gap-4">
            <FlipTile label="Player" value={data?.result?.p ?? 0} flipped={flip} />
            <FlipTile label="Banker" value={data?.result?.b ?? 0} flipped={flip} />
          </div>

          <div className="card glass">
            <div className="text-white/80 text-sm mb-2">近局路子</div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <span
                  key={r.roundSeq}
                  title={`#${r.roundSeq} P:${r.p} B:${r.b}`}
                  className={`px-2 py-1 rounded text-xs ${
                    r.outcome === "PLAYER"
                      ? "bg-cyan-400/30"
                      : r.outcome === "BANKER"
                      ? "bg-rose-400/30"
                      : "bg-amber-300/30"
                  }`}
                >
                  {r.outcome?.[0] ?? "-"}
                </span>
              ))}
              {!recent.length && <span className="text-white/50 text-sm">尚無</span>}
            </div>
          </div>
        </div>

        {/* 下注區 */}
        <div className="card glass">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              className="px-3 py-2 rounded bg-white/10 border border-white/15"
              value={betAmt}
              onChange={(e) => setBetAmt(parseInt(e.currentTarget.value || "0", 10))}
            />
            {(["PLAYER","BANKER","TIE","PLAYER_PAIR","BANKER_PAIR"] as Side[]).map((s) => (
              <button
                key={s}
                className="btn shimmer"
                disabled={placing || !data || data.phase !== "BETTING" || data.secLeft <= 0}
                onClick={() => place(s)}
              >
                押 {s}
              </button>
            ))}
          </div>

          {data?.myBets && (
            <div className="mt-3 text-sm text-white/80">
              我的投注：
              {Object.entries(data.myBets).length
                ? Object.entries(data.myBets).map(([k, v]) => (
                    <span key={k} className="ml-2">{k}:{v}</span>
                  ))
                : <span className="ml-2">尚無</span>}
            </div>
          )}
        </div>

        <div className="text-right">
          <a href="/lobby" className="underline text-white/80 hover:text-white">
            返回大廳
          </a>
        </div>
      </div>
    </main>
  );
}
