"use client";

import Link from "next/link";

const ROOMS = [
  { code: "R30", name: "百家樂 · 30秒房", desc: "快速節奏，適合短線進出" },
  { code: "R60", name: "百家樂 · 60秒房", desc: "標準節奏，最熱門" },
  { code: "R90", name: "百家樂 · 90秒房", desc: "慢速節奏，思考更充足" },
] as const;

export default function BaccaratLobby() {
  return (
    <div className="min-h-screen bg-casino-bg text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">百家樂大廳</h1>
          <Link href="/lobby" className="btn glass">
            ← 回大廳
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROOMS.map((r) => (
            <Link
              key={r.code}
              href={`/casino/baccarat/rooms/${r.code}`}
              className="group block rounded-2xl p-5 border border-white/10 bg-white/5 hover:border-white/30 transition"
            >
              <div className="text-xl font-bold mb-1">{r.name}</div>
              <div className="opacity-80 text-sm mb-4">{r.desc}</div>
              <div className="h-28 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 grid place-items-center">
                <span className="opacity-80">立即進入</span>
              </div>
              <div className="mt-4 text-right">
                <span className="inline-block px-3 py-1 rounded-full border border-white/20 group-hover:border-white/40 transition">
                  進入 {r.code} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
