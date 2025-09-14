export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { z } from "zod";

const toUndef = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().datetime().optional());

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  startAt: toUndef,
  endAt: toUndef,
});

// GET /api/admin/announcement/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.announcement.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(item);
}

// PATCH /api/admin/announcement/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const raw = await req.json();
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", detail: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const item = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      title: b.title ?? undefined,
      body: b.body ?? undefined,
      enabled: b.enabled ?? undefined,
      startAt: b.startAt ? new Date(b.startAt) : b.startAt === undefined ? undefined : null, // 允許明確傳 null 來清空
      endAt: b.endAt ? new Date(b.endAt) : b.endAt === undefined ? undefined : null,
    },
  });
  return NextResponse.json(item);
}

// DELETE /api/admin/announcement/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.announcement.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
