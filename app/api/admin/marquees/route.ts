export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

// 取得全部跑馬燈訊息（管理員）
export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const list = await prisma.marqueeMessage.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items: list });
}

// 新增跑馬燈訊息
export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const item = await prisma.marqueeMessage.create({
    data: {
      text: body.text,
      enabled: body.enabled ?? true,
      priority: body.priority ?? 0,
    },
  });
  return NextResponse.json(item);
}
