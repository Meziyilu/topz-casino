"use client";

import Link from "next/link";

export default function LobbyPage() {
  const rooms = [
    { code: "R30", name: "30秒房" },
    { code: "R60", name: "60秒房" },
    { code: "R90", name: "90秒房" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6 animate-fade-in">
        🎲 Casino 大廳
      </h1>
      <div className="grid md:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Link
            key={room.code}
            href={`/casino/baccarat/${room.code}`}
            className="p-6 rounded-xl bg-white/10 backdrop-blur-lg shadow-lg hover:scale-105 transition transform animate-fade-in"
          >
            <h2 className="text-xl font-bold">{room.name}</h2>
            <p className="text-sm text-gray-300">點擊進入</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
