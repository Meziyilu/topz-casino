"use client";

import { useEffect, useMemo, useState } from "react";

type RoomCode = "R30" | "R60" | "R90";

type LeaderboardItem = {
  userId?: string;
  name: string;
  amount: number; // 贏利或積分
  avatarUrl?: string | null;
};

type Props = {
  /** 顯示標題（預設：排行榜） */
  title?: string;
  /** 若你已經有資料，直接丟進來就不會 fetch */
  items?: LeaderboardItem[];
  /** 固定顯示某房間的榜（百家房內頁用） */
  fixedRoom?: RoomCode;
  /** 是否顯示房間切換（預設 true；房內頁可關閉） */
  showRoomSelector?: boolean;
};

export default function Leaderboard({
  title = "排行榜",
  items,
  fixedRoom,
  showRoomSelector = true,
}: Props) {
  const [room, setRoom] = useState<RoomCode>(fixedRoom ?? "R60");
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const useExternal = !items || items.length === 0;

  useEffect(() => {
    if (!useExternal) return;
    let stop = false;
    const run = async () => {
      try {
        setLoading(true);
        // 你可以把這支 API 換成你後端實作的路由
        const url = `/api/casino/baccarat/leaderboard?room=${room}`;
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!r.ok) {
          // 沒做這支 API 時，不要把錯丟給畫面
          setData([]);
          return;
        }
        const j = await r.json();
        if (!stop) setData(Array.isArray(j.items) ? j.items : []);
      } catch {
        if (!stop) setData([]);
      } finally {
        if (!stop) setLoading(false);
      }
    };
    run();
    const id = setInterval(run, 10_000); // 每 10 秒刷新一次
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [room, useExternal]);

  const rows = useMemo(() => (useExternal ? data : items || []), [useExternal, data, items]);

  return (
    <div className="glass rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold">{title}</div>
        {showRoomSelector && !fixedRoom && (
          <select
            className="bg-transparent border border-white/20 rounded px-2 py-1 outline-none"
            value={room}
            onChange={(e) => setRoom(e.target.value as RoomCode)}
            aria-label="選擇房間"
            title="選擇房間"
          >
            <option value="R30">R30</option>
            <option value="R60">R60</option>
            <option value="R90">R90</option>
          </select>
        )}
      </div>

      {loading && rows.length === 0 && (
        <div className="text-sm opacity-70">載入中…</div>
      )}

      {rows.length === 0 && !loading && (
        <div className="text-sm opacity-70">暫無資料</div>
      )}

      {rows.length > 0 && (
        <ol className="space-y-2">
          {rows.slice(0, 10).map((it, i) => (
            <li
              key={`${it.userId ?? it.name}-${i}`}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm opacity-70 w-6 text-right">#{i + 1}</span>
                {it.avatarUrl ? (
                  <img
                    src={it.avatarUrl}
                    alt={it.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 grid place-items-center">👤</div>
                )}
                <span className="font-semibold">{it.name}</span>
              </div>
              <div className="font-bold">{it.amount.toLocaleString()}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
