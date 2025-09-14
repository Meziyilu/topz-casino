"use client";
import { useEffect, useState } from "react";

export default function BaccaratLobby() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/casino/baccarat/rooms")
      .then((r) => r.json())
      .then((d) => {
        setRooms(d.rooms ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError("無法載入房間");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-white">載入中...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">百家樂大廳</h1>
      <div className="grid grid-cols-3 gap-4">
        {rooms.map((r) => (
          <a key={r.code} href={`/casino/baccarat/rooms/${r.code}`}>
            <div className="rounded-xl p-4 bg-gray-800 hover:bg-gray-700 transition">
              <h2 className="text-xl">房間 {r.code}</h2>
              <p>下注秒數: {r.betSeconds}</p>
              <p>開牌秒數: {r.revealSeconds}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
