// components/Leaderboard.tsx
"use client";
import { useEffect, useState } from "react";

type Item = { rank: number; name: string; score: number };
export default function Leaderboard({ fixedRoom, showRoomSelector=false }:{
  fixedRoom?: "R30"|"R60"|"R90";
  showRoomSelector?: boolean;
}) {
  const [room, setRoom] = useState<"R30"|"R60"|"R90">(fixedRoom || "R60");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/casino/baccarat/leaderboard?room=${room}`, { cache:"no-store" });
      if (!res.ok) { setItems([]); return; }
      const json = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [room]);

  return (
    <div className="glass glow-ring p-6 rounded-2xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-bold">排行榜</div>
        {!fixedRoom && showRoomSelector && (
          <select value={room} onChange={e=>setRoom(e.target.value as any)} className="bg-black/30 border border-white/20 rounded px-2 py-1">
            <option value="R30">R30</option>
            <option value="R60">R60</option>
            <option value="R90">R90</option>
          </select>
        )}
      </div>

      {loading && <div className="opacity-70 text-sm">載入中…</div>}
      {!loading && items.length === 0 && <div className="opacity-70 text-sm">暫無資料</div>}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.rank} className="flex items-center justify-between border border-white/10 px-3 py-2 rounded-lg">
              <span className="opacity-80">#{it.rank}</span>
              <span className="font-semibold">{it.name || "-"}</span>
              <span className="tabular-nums">{Number(it.score || 0).toLocaleString?.() ?? (it.score || 0)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
