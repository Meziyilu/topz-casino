// app/api/wall/post/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// 如果 lib/prisma 是 default export 請改成：import prisma from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const Q = z.object({
  body: z.string().trim().min(1).max(500),
});

export async function POST(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const data = await req.json().catch(() => ({}));
  const parsed = Q.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const post = await prisma.wallPost.create({
    data: { userId: me.id, body: parsed.data.body }, // ✅ 改成 userId
    select: {
      id: true,
      body: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, post });
}
