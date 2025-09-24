import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  await prisma.wallPost.update({
    where: { id: postId },
    data: { likeCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  await prisma.wallPost.update({
    where: { id: postId },
    data: { likeCount: { decrement: 1 } },
  });

  return NextResponse.json({ ok: true });
}
