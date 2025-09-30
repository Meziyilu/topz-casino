"use client";

import { useCallback, useState } from "react";
import PostComposer from "@/components/social/PostComposer";
import FeedList from "@/components/social/FeedList";
import "@/public/styles/social.css"; // 在 Client 載入全域社交樣式

export default function FeedClientPage() {
  const [refreshFlag, setRefreshFlag] = useState(0);
  const handleRefresh = useCallback(() => setRefreshFlag((n) => n + 1), []);

  return (
    <div className="feed-page">
      <section>
        {/* 發文框 */}
        <PostComposer onPosted={handleRefresh} />

        {/* 動態清單（無限滾動），支援 refreshFlag */}
        <FeedList refreshFlag={refreshFlag} />

        {/* 右下補充操作 */}
        <div className="feed-loading" style={{ justifyContent: "flex-end" }}>
          <button className="s-btn primary pill" onClick={handleRefresh} data-sound>
            🔄 重新整理
          </button>
        </div>
      </section>

      {/* 側欄 */}
      <aside className="feed-aside">
        <div className="feed-card">
          <div className="title">小提示</div>
          貼多張圖：圖片網址以空白或逗號分隔
        </div>
        <div className="feed-card">
          <div className="title">規範</div>
          請避免張貼違規內容。
        </div>
      </aside>
    </div>
  );
}
