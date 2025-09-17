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
          <div className="icon" aria-hidden>
            {/* Storefront icon */}
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 9.5 5 4h14l2 5.5V11a4 4 0 0 1-4 4h-2v5H9v-5H7A4 4 0 0 1 3 11V9.5Z"/>
              <path d="M7 11V9h10v2"/>
            </svg>
          </div>
          <div className="title">商店總覽</div>
          <div className="desc">銷售概況 / 熱門商品 / 快速入口</div>
        </a>

        <a className="tile glass" href="/admin/shop/items">
          <div className="icon" aria-hidden>
            {/* Tag/price icon */}
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M20.59 13.41 12 22l-8.59-8.59V4h9.41L22 12.59z"/>
              <circle cx="7.5" cy="8.5" r="1.5"/>
            </svg>
          </div>
          <div className="title">商品 / SKU</div>
          <div className="desc">新增商品、上架頭框、SKU 管理</div>
        </a>

        <a className="tile glass" href="/admin/shop/bundles">
          <div className="icon" aria-hidden>
            {/* Bundle/box icon */}
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="m12 2 9 5-9 5-9-5 9-5Z"/>
              <path d="M21 7v7l-9 5-9-5V7"/>
            </svg>
          </div>
          <div className="title">套組管理</div>
          <div className="desc">建立套組 / 加入 SKU / 定價</div>
        </a>

        <a className="tile glass" href="/admin/shop/purchases">
          <div className="icon" aria-hidden>
            {/* Receipt/list icon */}
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2Z"/>
              <path d="M8 8h8M8 12h8M8 16h5"/>
            </svg>
          </div>
          <div className="title">訂單 / 購買紀錄</div>
          <div className="desc">查詢訂單、SKU 使用數、退款</div>
        </a>

        {/* === 你原本的模組 === */}
        {/* 百家樂 */}
        <a className="tile glass" href="/admin/baccarat">
          <div className="icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M7 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm11 4h-1v10a3 3 0 0 1-3 3H8v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
          <div className="title">百家樂管理</div>
          <div className="desc">開始 / 結算 / 自動輪播</div>
        </a>

        {/* 金幣管理 */}
        <a className="tile glass" href="/admin/coins">
          <div className="icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 2C6.477 2 2 4.239 2 7s4.477 5 10 5 10-2.239 10-5-4.477-5-10-5Zm0 12c-5.523 0-10-2.239-10-5v4c0 2.761 4.477 5 10 5s10-2.239 10-5V9c0 2.761-4.477 5-10 5Zm0 6c-5.523 0-10-2.239-10-5v4c0 2.761 4.477 5 10 5s10-2.239 10-5v-4c0 2.761-4.477 5-10 5Z"/>
            </svg>
          </div>
          <div className="title">金幣管理</div>
          <div className="desc">搜尋玩家、加/扣金幣（錢包/銀行）</div>
        </a>

        {/* 骰寶管理 */}
        <a className="tile glass" href="/admin/sicbo">
          <div className="icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M11 2 3 6v8l8 4 8-4V6l-8-4Zm0 2.236L17.764 6 11 9.764 4.236 6 11 4.236ZM5 7.618l6 3.146V19l-6-3V7.618Zm14 8.382-6 3v-6.236l6-3V16Z"/>
              <circle cx="8.5" cy="8.5" r="1.2"/>
              <circle cx="13.5" cy="6.5" r="1.2"/>
              <circle cx="15.5" cy="11.5" r="1.2"/>
            </svg>
          </div>
          <div className="title">骰寶管理</div>
          <div className="desc">開局 / 封盤 / 開獎動畫 / 自動開局</div>
        </a>

        {/* 樂透管理 */}
        <a className="tile glass" href="/admin/lotto">
          <div className="icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <circle cx="7.5" cy="8.5" r="3.5"/>
              <circle cx="15.5" cy="6.5" r="2.5"/>
              <circle cx="15.5" cy="14.5" r="4.0"/>
            </svg>
          </div>
          <div className="title">樂透管理</div>
          <div className="desc">開獎排程 / 開獎號碼 / 期別管理</div>
        </a>

        {/* 跑馬燈管理 */}
        <a className="tile glass" href="/admin/content/marquee">
          <div className="icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 10v4a2 2 0 0 0 2 2h2l2 3h2v-3h1l7-4V8l-7-4H7a4 4 0 0 0-4 4Z"/>
              <path d="M19 8v8"/>
            </svg>
          </div>
          <div className="title">跑馬燈管理</div>
          <div className="desc">滾動訊息設定 / 優先度排序 / 啟用停用</div>
        </a>

        {/* 公告欄管理 */}
        <a className="tile glass" href="/admin/content/announcement">
          <div className="icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M5 3h14a2 2 0 0 1 2 2v11l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>
              <path d="M7 21h10"/>
            </svg>
          </div>
          <div className="title">公告欄管理</div>
          <div className="desc">新增 / 編輯 / 啟用停用</div>
        </a>
      </section>

      {/* 既有管理首頁樣式 */}
      <link rel="stylesheet" href="/styles/admin/admin-home.css" />
    </main>
  );
}
