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
        {/* 百家樂 */}
        <a className="tile glass" href="/admin/baccarat">
          <div className="title">百家樂管理</div>
          <div className="desc">開始 / 結算 / 自動輪播</div>
        </a>

        {/* 金幣管理 */}
        <a className="tile glass" href="/admin/coins">
          <div className="title">金幣管理</div>
          <div className="desc">搜尋玩家、加/扣金幣（錢包/銀行）</div>
        </a>

        {/* 骰寶管理 */}
        <a className="tile glass" href="/admin/sicbo">
          <div className="title">骰寶管理</div>
          <div className="desc">開局 / 封盤 / 開獎動畫 / 自動開局</div>
        </a>

        {/* 樂透管理 */}
        <a className="tile glass" href="/admin/lotto">
          <div className="title">樂透管理</div>
          <div className="desc">開獎排程 / 開獎號碼 / 期別管理</div>
        </a>

        {/* 跑馬燈管理 */}
        <a className="tile glass" href="/admin/content/marquee">
          <div className="title">跑馬燈管理</div>
          <div className="desc">滾動訊息設定 / 優先度排序 / 啟用停用</div>
        </a>

        {/* 公告欄管理 */}
        <a className="tile glass" href="/admin/content/announcement">
          <div className="title">公告欄管理</div>
          <div className="desc">新增公告 / 編輯公告 / 啟用停用</div>
        </a>
      </section>

      {/* 既有管理首頁樣式 */}
      <link rel="stylesheet" href="/styles/admin/admin-home.css" />
    </main>
  );
}
