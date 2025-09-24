// app/api/social/feed/post/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 暫時版：不寫入 DB，只是模擬發文成功
 * 讓 /social/feed 頁面可以跑通
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, imageUrl } = await req.json();

  // 模擬一筆新貼文
  const post = {
    id: "fake-" + Date.now(),
    userId: user.id,
    content: body ?? "",
    imageUrl: imageUrl ?? null,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    likedByMe: false,
  };

  return NextResponse.json({ post });
}
