"use client";
import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="min-h-screen text-white bg-[radial-gradient(900px_600px_at_10%_-10%,rgba(96,165,250,.12),transparent_60%),radial-gradient(900px_700px_at_110%_0%,rgba(167,139,250,.12),transparent_60%)]">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">後台總覽</h1>

        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/admin/baccarat" className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:border-white/35 transition block">
            <div className="text-lg font-semibold">百家樂管理</div>
            <div className="text-sm opacity-80 mt-1">開局 / 開牌 / 結算 / 重置</div>
          </Link>

          <a href="/api/health" className="rounded-2xl border border-white/15 bg-white/5 p-5 hover:border-white/35 transition block">
            <div className="text-lg font-semibold">健康檢查</div>
            <div className="text-sm opacity-80 mt-1">API/DB 基本檢查</div>
          </a>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <div className="text-lg font-semibold">小提示</div>
            <div className="text-sm opacity-80 mt-1">此版本無 Worker/Cron，請用按鈕驅動流程。</div>
          </div>
        </div>
      </div>
    </main>
  );
}
