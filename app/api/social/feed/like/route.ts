import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { feedId } = await req.json();
  if (!feedId) return NextResponse.json({ error: "Missing feedId" }, { status: 400 });

  await prisma.feed.update({
    where: { id: feedId },
    data: { likeCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { feedId } = await req.json();
  if (!feedId) return NextResponse.json({ error: "Missing feedId" }, { status: 400 });

  await prisma.feed.update({
    where: { id: feedId },
    data: { likeCount: { decrement: 1 } },
  });

  return NextResponse.json({ ok: true });
}
