"use client";

import Link from "next/link";
import useSWR from "swr";
import { useRouter } from "next/navigation";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function LobbyPage() {
  const router = useRouter();
  const { data: me } = useSWR("/api/auth/me", fetcher);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth");
  }

  return (
    <div className="min-h-screen bg-casino-bg text-white flex flex-col items-center p-6 space-y-8">
      {/* 跑馬燈公告 */}
      <div className="w-full bg-gradient-to-r from-purple-800 via-pink-600 to-purple-800 text-center py-2 rounded-lg animate-pulse">
        🎉 歡迎來到 TOPZ CASINO！請理性娛樂 🎉
      </div>

      {/* 標題 */}
      <h1 className="text-4xl font-extrabold drop-shadow-md">大廳 Lobby</h1>

      {/* 房間卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {[
          { code: "R30", name: "百家樂 - 30秒房" },
          { code: "R60", name: "百家樂 - 60秒房" },
          { code: "R90", name: "百家樂 - 90秒房" },
        ].map((room) => (
          <Link
            key={room.code}
            href={`/casino/baccarat/${room.code}`}
            className="room-card glow-ring sheen tilt p-6 flex flex-col items-center justify-center"
          >
            <h2 className="text-2xl font-bold">{room.name}</h2>
            <p className="mt-2 text-sm opacity-80">進入房間下注！</p>
          </Link>
        ))}
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-10">
        {/* 銀行 */}
        <Link
          href="/bank"
          className="room-card glow-ring sheen tilt p-6 flex flex-col items-center justify-center"
        >
          <h2 className="text-2xl font-bold">🏦 銀行</h2>
          <p className="mt-2 text-sm opacity-80">存款 / 提款 / 餘額查詢</p>
        </Link>

        {/* 管理員（只有 admin 才顯示） */}
        {me?.isAdmin && (
          <Link
            href="/admin"
            className="room-card glow-ring sheen tilt p-6 flex flex-col items-center justify-center"
          >
            <h2 className="text-2xl font-bold">⚙️ 管理員面板</h2>
            <p className="mt-2 text-sm opacity-80">管理用戶與房間</p>
          </Link>
        )}

        {/* 登出 */}
        <button
          onClick={handleLogout}
          className="room-card glow-ring sheen tilt p-6 flex flex-col items-center justify-center"
        >
          <h2 className="text-2xl font-bold">🚪 登出</h2>
          <p className="mt-2 text-sm opacity-80">返回登入頁</p>
        </button>
      </div>
    </div>
  );
}
