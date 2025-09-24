// app/api/social/feed/like/route.ts
import { NextResponse } from "next/server";

// 不改 Prisma（你要求不要動 schema），所以暫時不 import prisma、不寫入資料庫
// import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 暫時版：只回傳成功，前端自己把 like 數 +1 / -1
 * 之後若你允許改 Prisma schema（或本來就有獨立的 Like 表），再把 DB 寫入打開。
 *
 * 請求格式：
 * POST /api/social/feed/like
 * body: { postId: string, action?: 'like' | 'unlike' }
 */
export async function POST(req: Request) {
  try {
    const { postId, action } = await req.json().catch(() => ({} as any));
    if (!postId) {
      return NextResponse.json({ ok: false, error: "Missing postId" }, { status: 400 });
    }

    // 這裡暫時不寫 DB（因為沒有 likeCount 欄位、且你不想動 prisma）
    // 若未來要真正記錄，建議做法（2擇1）：
    // 1) 在 WallPost 加欄位 likeCount，然後 prisma.wallPost.update({ data: { likeCount: { increment: 1 } } })
    // 2) 建一張 WallLike(postId, userId, createdAt)，前端同時帶上身份，這裡做 upsert / delete

    // 先回傳目前請求意圖，前端自行本地更新 UI
    return NextResponse.json({ ok: true, postId, action: action ?? "like" });
  } catch (e) {
    console.error("FEED_LIKE_POST", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
