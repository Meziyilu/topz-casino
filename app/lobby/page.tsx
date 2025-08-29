"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Room = {
  code: string;
  name: string;
  durationSeconds: number;
  secLeft?: number;
};

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([
    { code: "R30", name: "30秒房", durationSeconds: 30 },
    { code: "R60", name: "60秒房", durationSeconds: 60 },
    { code: "R90", name: "90秒房", durationSeconds: 90 },
  ]);

  // 模擬倒數（未來可直接串 API /state）
  useEffect(() => {
    const interval = setInterval(() => {
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          secLeft: Math.max(0, (r.secLeft ?? r.durationSeconds) - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-casino-bg text-white p-6 space-y-6">
      {/* 🟣 跑馬燈 */}
      <div className="glass rounded-lg p-3 text-center animate-pulse">
        🎉 歡迎來到 TOPZ CASINO — 最新公告：每日登入送 100 金幣！
      </div>

      {/* 🔵 功能卡片：銀行 / 管理員 / 登出 */}
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        <div
          onClick={() => router.push("/bank")}
          className="card sheen cursor-pointer text-center"
        >
          🏦 銀行
        </div>
        <div
          onClick={() => router.push("/admin")}
          className="card sheen cursor-pointer text-center"
        >
          🛠️ 管理員
        </div>
        <div
          onClick={() => {
            document.cookie = "token=; Max-Age=0; path=/";
            router.push("/auth");
          }}
          className="card sheen cursor-pointer text-center"
        >
          🚪 登出
        </div>
      </div>

      {/* 🟡 房間卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-6">
        {rooms.map((room) => (
          <div
            key={room.code}
            onClick={() => router.push(`/casino/baccarat/${room.code}`)}
            className="room-card glass glow-ring p-6 flex flex-col items-center justify-center"
          >
            <h2 className="text-xl font-bold mb-2">{room.name}</h2>
            <p>局長: {room.durationSeconds}s</p>
            <p className="mt-2">
              倒數:{" "}
              <span className="font-mono text-lg">
                {room.secLeft ?? room.durationSeconds}s
              </span>
            </p>
            <button className="btn mt-4">進入房間</button>
          </div>
        ))}
      </div>
    </main>
  );
}
