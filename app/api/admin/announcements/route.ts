// /app/api/admin/announcements/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function GET(req: Request) {
  const auth = verifyRequest(req); // ← 修正這行
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const list = await prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const auth = verifyRequest(req); // ← 修正這行
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const data = body;

  const created = await prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      enabled: data.enabled ?? true,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    },
  });
  return NextResponse.json(created);
}
