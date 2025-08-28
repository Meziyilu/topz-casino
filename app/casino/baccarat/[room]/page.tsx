// app/casino/baccarat/[room]/page.tsx
"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function RoomPage({ params }: { params: { room: string } }) {
  const roomCode = (params.room || "R60").toUpperCase();

  const { data, error, isLoading } = useSWR(
    `/api/casino/baccarat/state?room=${roomCode}`,
    fetcher,
    {
      refreshInterval: 1000,   // 每秒更新
      dedupingInterval: 500,
      revalidateOnFocus: false,
    }
  );

  const phaseText =
    data?.phase === "BETTING"
      ? "下注中"
      : data?.phase === "REVEAL"
      ? "開牌中"
      : data?.phase === "SETTLED"
      ? "已結算"
      : "-";

  return (
    <div className="min-h-screen p-6 text-white">
      <div className="max-w-4xl mx-auto glass-panel p-6 rounded-2xl">
        <h1 className="text-2xl font-bold tracking-wider">房間 {roomCode}</h1>

        {error && <div className="text-red-400 mt-2">載入錯誤</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <InfoItem label="局長" value={`${data?.room?.durationSeconds ?? 0}s`} />
          <InfoItem label="局序" value={String(data?.roundSeq ?? 0).padStart(4, "0")} />
          <InfoItem label="狀態" value={phaseText} />
          <InfoItem label="倒數" value={`${data?.secLeft ?? 0}s`} />
        </div>

        {/* TODO: 這裡接你的下注面板 / 翻牌動畫 */}
        <div className="mt-6">
          <pre className="text-xs/relaxed opacity-70 overflow-auto">
            {JSON.stringify(data?.result ?? {}, null, 2)}
          </pre>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold mb-2">路子（近 10 局）</h2>
          <div className="flex flex-wrap gap-2">
            {(data?.recent ?? []).map((r: any) => (
              <div key={r.roundSeq} className="px-3 py-2 rounded-lg bg-white/10">
                #{r.roundSeq}：{r.outcome}（P{r.p} / B{r.b}）
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
