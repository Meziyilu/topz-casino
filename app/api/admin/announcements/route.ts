export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function assertAdmin() {
  // TODO: 實作你自己的驗證邏輯
  return true;
}

export async function GET(req: NextRequest) {
  await assertAdmin();
  const { searchParams } = new URL(req.url);
  const enabledParam = searchParams.get("enabled");
  const enabled = enabledParam === "" ? undefined : enabledParam === "1";

  const items = await prisma.announcement.findMany({
    where: typeof enabled === "boolean" ? { enabled } : undefined,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await assertAdmin();
  const body = await req.json();
  const item = await prisma.announcement.create({
    data: {
      title: String(body.title ?? ""),
      body: String(body.body ?? ""),
      enabled: Boolean(body.enabled ?? true),
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
    },
  });
  return NextResponse.json({ item });
}
