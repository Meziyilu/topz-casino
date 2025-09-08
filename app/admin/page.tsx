"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-white">
      <h1 className="text-2xl font-bold mb-6">管理總面板</h1>

      <div className="grid gap-4">
        <Link
          href="/admin/baccarat"
          className="block rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition p-4"
        >
          <div className="text-lg font-semibold">百家樂控制台</div>
          <div className="text-sm opacity-80 mt-1">開新局、結算、手動 tick、觀察房況</div>
        </Link>

        {/* 之後有其它遊戲／系統設定，就照樣新增更多卡片連結 */}
      </div>
    </main>
  );
}
