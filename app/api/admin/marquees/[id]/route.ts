export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const data = body;

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
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.marqueeMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
