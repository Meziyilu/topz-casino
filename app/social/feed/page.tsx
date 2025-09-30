import { Suspense } from "react";
import NextDynamic from "next/dynamic";

export const revalidate = false;           // 關閉 ISR，避免 revalidate 錯誤
export const dynamic = "force-dynamic";    // 明確走動態（可保留或移除）

const FeedClientPage = NextDynamic(() => import("./page.client"), { ssr: false });

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="feed-loading">
          <span className="loader-dot" />
          <span className="loader-dot" />
          <span className="loader-dot" />
        </div>
      }
    >
      <FeedClientPage />
    </Suspense>
  );
}
