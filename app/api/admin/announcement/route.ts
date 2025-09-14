export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

// 取得公告
export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const items = await prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

// 新增公告
export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  const item = await prisma.announcement.create({
    data: {
      title: body.title,
      body: body.body,
      enabled: body.enabled ?? true,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
    },
  });
  return NextResponse.json(item);
}
