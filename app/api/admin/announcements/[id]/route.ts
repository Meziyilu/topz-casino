export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function assertAdmin() { return true; }

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await assertAdmin();
  const body = await req.json();
  const item = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      startAt: body.startAt === undefined ? undefined : (body.startAt ? new Date(body.startAt) : null),
      endAt: body.endAt === undefined ? undefined : (body.endAt ? new Date(body.endAt) : null),
    },
  });
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await assertAdmin();
  await prisma.announcement.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
