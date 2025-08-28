"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Phase = "BETTING" | "REVEALING" | "SETTLED";
type Side = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

type StateResp = {
  room: { code: string; name: string; durationSeconds: number };
  day: string;
  roundSeq: number | null;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: string | null; p: number | null; b: number | null };
  myBets: Record<string, number>;
  recent: { roundSeq: number | null; outcome: string | null; p: number; b: number }[];
};

const BET_SIDES: { key: Side; label: string }[] = [
  { key: "PLAYER", label: "閒" },
  { key: "BANKER", label: "莊" },
  { key: "TIE", label: "和" },
  { key: "PLAYER_PAIR", label: "閒對" },
  { key: "BANKER_PAIR", label: "莊對" },
];

export default function BaccaratRoom() {
  const params = useParams<{ room: string }>();
  const roomCode = String(params.room || "R60").toUpperCase();

  const [data, setData] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<Side | null>(null);
  const [amount, setAmount] = useState(100);

  // 輪詢狀態
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/casino/baccarat/state?room=${roomCode}`, { cache: "no-store" });
        if (!res.ok) throw new Error("state error");
        const json = (await res.json()) as StateResp;
        if (alive) setData(json);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 1000); // 每秒刷新
    return () => { alive = false; clearInterval(id); };
  }, [roomCode]);

  async function place(side: Side) {
    if (!data) return;
    setPlacing(side);
    try {
      const res = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ room: roomCode, side, amount }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error || "下注失敗");
      // 成功後下一輪輪詢就會更新 myBets
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || "下注失敗");
    } finally {
      setPlacing(null);
    }
  }

  const secLeft = data?.secLeft ?? 0;
  const phase = data?.phase ?? "BETTING";

  const road = useMemo(() => {
    return (data?.recent || []).slice(0, 40);
  }, [data]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* 頂部資訊 */}
      <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl p-4">
          <div className="text-sm opacity-70">房間</div>
          <div className="text-xl font-bold">{data?.room.name ?? roomCode}</div>
          <div className="text-xs opacity-70 mt-1">代碼：{roomCode}</div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-sm opacity-70">局序</div>
          <div className="text-xl font-bold">{data?.roundSeq ?? "--"}</div>
          <div className="text-xs opacity-70 mt-1">狀態：{phase}</div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-sm opacity-70">倒數</div>
          <div className="text-3xl font-extrabold">
            {secLeft}s
          </div>
          <div className="text-xs opacity-70 mt-1">下注秒數：{data?.room.durationSeconds ?? 0}</div>
        </div>
      </div>

      {/* 路子圖 */}
      <div className="max-w-6xl mx-auto glass rounded-xl p-4">
        <div className="text-sm opacity-80 mb-3">路子圖</div>
        <div className="road-grid">
          {road.map((r, i) => {
            const cls =
              r.outcome === "PLAYER" ? "road-p" :
              r.outcome === "BANKER" ? "road-b" :
              "road-t";
            return <div key={i} className={`road-cell ${cls}`} title={`#${r.roundSeq} ${r.outcome}`}></div>;
          })}
        </div>
      </div>

      {/* 下注區 */}
      <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 glass rounded-xl p-4">
          <div className="text-sm opacity-80 mb-2">投注額</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="w-40 px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value || 1)))}
            />
            <div className="flex gap-2">
              {[100, 500, 1000].map(v => (
                <button key={v} onClick={() => setAmount(v)} className="bet-btn">{v}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {BET_SIDES.map((b) => (
              <button
                key={b.key}
                disabled={phase !== "BETTING" || placing !== null}
                onClick={() => place(b.key)}
                className={`btn rounded-lg ${placing === b.key ? "shimmer opacity-80" : ""}`}
              >
                {b.label}
                {!!data?.myBets?.[b.key] && (
                  <span className="ml-2 text-xs opacity-90">(我：{data.myBets[b.key]})</span>
                )}
              </button>
            ))}
          </div>

          {phase !== "BETTING" && (
            <div className="mt-3 text-sm opacity-80">目前不可下注（{phase}）</div>
          )}
        </div>

        {/* 結果 / 翻牌展示（簡版占位，等動畫資產再補） */}
        <div className="md:col-span-3 glass rounded-xl p-4">
          <div className="text-sm opacity-80 mb-2">結果展示</div>
          {data?.result ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 rounded-xl bg-black/20 border border-white/10">
                <div className="opacity-70 mb-1">玩家</div>
                <div className="text-3xl font-extrabold">{data.result.p ?? "-"}</div>
              </div>
              <div className="grid place-items-center">
                <div className="text-xl font-bold">{data.result.outcome ?? "-"}</div>
              </div>
              <div className="card p-4 rounded-xl bg-black/20 border border-white/10">
                <div className="opacity-70 mb-1">莊家</div>
                <div className="text-3xl font-extrabold">{data.result.b ?? "-"}</div>
              </div>
            </div>
          ) : (
            <div className="opacity-70">待開牌 / 動畫播放中…</div>
          )}
        </div>
      </div>
    </div>
  );
}
