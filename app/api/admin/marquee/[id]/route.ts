export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

const MarqueeUpdateSchema = z.object({
  text: z.string().min(1).optional(),
  priority: z.coerce.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  startAt: emptyToUndef(z.coerce.date().optional()),
  endAt: emptyToUndef(z.coerce.date().optional()),
});

async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null as any;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const forbid = await requireAdmin(req);
  if (forbid) return forbid;

  const json = await req.json();
  const data = MarqueeUpdateSchema.parse(json);

  const row = await prisma.marqueeMessage.update({
    where: { id: params.id },
    data: {
      ...("text" in data ? { text: data.text } : {}),
      ...("priority" in data ? { priority: data.priority } : {}),
      ...("enabled" in data ? { enabled: data.enabled } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt ?? null } : {}),
      ...(data.endAt !== undefined ? { endAt: data.endAt ?? null } : {}),
    },
  });

  return NextResponse.json({ item: row });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const forbid = await requireAdmin(req);
  if (forbid) return forbid;

  await prisma.marqueeMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
