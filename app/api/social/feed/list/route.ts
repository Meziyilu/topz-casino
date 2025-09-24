// app/api/social/feed/list/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 暫時版：不讀取 Prisma，回傳假資料
 * 讓 /social/feed 可以跑通。未來若允許改 Prisma，再接 WallPost 表。
 *
 * 支援 query: cursor（用來無限滾動）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  // 模擬假資料：固定 10 筆
  const items = Array.from({ length: 10 }, (_, i) => {
    const id = cursor ? `${cursor}-${i + 1}` : `post-${i + 1}`;
    return {
      id,
      userId: `user-${i + 1}`,
      content: `這是測試貼文 #${i + 1}`,
      createdAt: new Date().toISOString(),
      likeCount: Math.floor(Math.random() * 20),
      likedByMe: false,
      imageUrl: null,
    };
  });

  return NextResponse.json({
    items,
    nextCursor: items.length ? items[items.length - 1].id : null,
  });
}
