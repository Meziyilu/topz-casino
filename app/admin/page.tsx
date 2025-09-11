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

        <a className="tile glass" href="/admin/coins">
          <div className="title">金幣管理</div>
          <div className="desc">搜尋玩家、加/扣金幣（錢包/銀行）</div>
        </a>
      </section>

      <link rel="stylesheet" href="/styles/admin/admin-home.css" />
    </main>
  );
}
