// app/social/feed/page.client.tsx
"use client";

import { useCallback, useState } from "react";
import PostComposer from "@/components/social/PostComposer";
import FeedList from "@/components/social/FeedList";

export default function FeedClientPage() {
  const [refreshFlag, setRefreshFlag] = useState(0);
  const handleRefresh = useCallback(() => setRefreshFlag((n) => n + 1), []);

  return (
    <div className="feed-page">
      <section>
        <PostComposer onPosted={handleRefresh} />
        <FeedList refreshFlag={refreshFlag} />
        <div className="feed-loading" style={{ justifyContent: "flex-end" }}>
          <button className="pa-btn" onClick={handleRefresh} data-sound>🔄 重新整理</button>
        </div>
      </section>

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
