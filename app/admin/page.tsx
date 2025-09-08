"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="admin-wrap stack">
      <div className="panel stack">
        <div className="h1">管理主控台</div>
        <div className="muted">在這裡進入各功能面板。</div>
        <div className="row">
          <Link href="/admin/baccarat" className="btn">百家樂管理</Link>
        </div>
      </div>

      <div className="panel">
        <div className="h1" style={{marginBottom:8}}>Cron 說明</div>
        <div className="stack">
          <div>建議用 Render Cron/UptimeRobot 每 5–10 秒打：</div>
          <div className="code">POST /api/casino/baccarat/admin/auto?room=R30&token=YOUR_ADMIN_TOKEN</div>
          <div className="muted">（R60/R90 另行設定各自 cron）</div>
        </div>
      </div>
    </main>
  );
}
