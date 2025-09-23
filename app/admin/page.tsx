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
        {/* === 商店管理 === */}
        <a className="tile glass" href="/admin/shop">
          ...
        </a>
        <a className="tile glass" href="/admin/shop/items">...</a>
        <a className="tile glass" href="/admin/shop/bundles">...</a>
        <a className="tile glass" href="/admin/shop/purchases">...</a>

        {/* === 遊戲管理 === */}
        <a className="tile glass" href="/admin/baccarat">...</a>
        <a className="tile glass" href="/admin/coins">...</a>
        <a className="tile glass" href="/admin/sicbo">...</a>
        <a className="tile glass" href="/admin/lotto">...</a>

        {/* === 內容管理 === */}
        <a className="tile glass" href="/admin/marquee">
          <div className="icon" aria-hidden>…</div>
          <div className="title">跑馬燈管理</div>
          <div className="desc">滾動訊息設定 / 優先度排序 / 啟用停用</div>
        </a>

        <a className="tile glass" href="/admin/announcements">
          <div className="icon" aria-hidden>…</div>
          <div className="title">公告欄管理</div>
          <div className="desc">新增 / 編輯 / 啟用停用</div>
        </a>
      </section>

      <link rel="stylesheet" href="/styles/admin/admin-home.css" />
    </main>
  );
}
