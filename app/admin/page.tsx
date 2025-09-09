// app/admin/page.tsx
"use client";

export default function AdminHome() {
  return (
    <main className="admin-home">
      <header className="admin-home-head glass">
        <h1>管理首頁</h1>
        <p className="sub">選擇要管理的模組</p>
      </header>

      <section className="admin-home-grid">
        <a className="tile glass" href="/admin/baccarat">
          <div className="title">百家樂管理</div>
          <div className="desc">開始 / 結算 / 自動輪播</div>
        </a>
        {/* 之後新增其它遊戲管理 tile */}
      </section>

      <link rel="stylesheet" href="/style/admin/admin-home.css" />
    </main>
  );
}
