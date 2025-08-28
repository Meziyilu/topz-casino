// app/casino/[room]/page.tsx
"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

export default function RoomPage({ params }: { params: { room: string } }) {
  const room = (params.room || "R60").toUpperCase();
  const { data, mutate } = useSWR(`/api/casino/baccarat/state?room=${room}`, fetcher, { refreshInterval: 1000 });

  async function bet(side: string, amount = 100) {
    const res = await fetch("/api/casino/baccarat/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, side, amount }),
    }).then(r => r.json());
    if (res.ok) mutate();
    else alert(res.error || "下注失敗");
  }

  if (!data) return <div className="p-6">載入中…</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{data.room?.name}（{data.room?.code}）</h2>
        <div className="opacity-80">局序 #{String(data.roundSeq).padStart(4,"0")} ｜ 狀態 {data.phase} ｜ 倒數 {data.secLeft}s</div>
      </div>

      <div className="flex gap-3 mb-6">
        {["PLAYER","BANKER","TIE","PLAYER_PAIR","BANKER_PAIR"].map(s => (
          <button key={s} onClick={() => bet(s, 100)}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20">
            壓 {s} 100
          </button>
        ))}
      </div>

      <div className="rounded-xl p-4 bg-white/5 backdrop-blur border border-white/10">
        <div className="font-semibold mb-2">我的當局投注</div>
        <pre className="text-sm">{JSON.stringify(data.myBets, null, 2)}</pre>
      </div>

      <div className="rounded-xl p-4 mt-6 bg-white/5 backdrop-blur border border-white/10">
        <div className="font-semibold mb-2">今日路子（近20局）</div>
        <div className="flex flex-wrap gap-2">
          {data.recent?.map((r: any) => (
            <span key={r.roundSeq} className="px-2 py-1 rounded bg-white/10">
              #{r.roundSeq} {r.outcome ?? "-"} ({r.p}:{r.b})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
