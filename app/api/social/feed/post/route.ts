import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, imageUrl } = await req.json();

  const post = await prisma.feed.create({
    data: { userId: user.id, body, imageUrl },
  });

  return NextResponse.json(post);
}
