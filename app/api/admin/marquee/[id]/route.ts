export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { z } from "zod";

const UpdateSchema = z.object({
  text: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
});

// GET /api/admin/marquee/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.marqueeMessage.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(item);
}

// PATCH /api/admin/marquee/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const raw = await req.json();
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", detail: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const item = await prisma.marqueeMessage.update({
    where: { id: params.id },
    data: {
      text: b.text ?? undefined,
      enabled: b.enabled ?? undefined,
      priority: b.priority ?? undefined,
    },
  });
  return NextResponse.json(item);
}

// DELETE /api/admin/marquee/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.marqueeMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
