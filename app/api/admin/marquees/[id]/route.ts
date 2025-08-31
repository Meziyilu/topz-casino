import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { upsertMarqueeSchema } from "@/lib/validation/admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const data = upsertMarqueeSchema.partial().parse(body);

  const updated = await prisma.marqueeMessage.update({
    where: { id: params.id },
    data: {
      ...(data.text !== undefined ? { text: data.text } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.marqueeMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
