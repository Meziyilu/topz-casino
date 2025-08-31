import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { upsertAnnouncementSchema } from "@/lib/validation/admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const data = upsertAnnouncementSchema.partial().parse(body);

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt ? new Date(data.startAt) : null } : {}),
      ...(data.endAt !== undefined ? { endAt: data.endAt ? new Date(data.endAt) : null } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.announcement.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
