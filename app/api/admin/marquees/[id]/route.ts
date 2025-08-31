export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

// 修改跑馬燈訊息
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const item = await prisma.marqueeMessage.update({
    where: { id: params.id },
    data: {
      text: body.text,
      enabled: body.enabled,
      priority: body.priority,
    },
  });
  return NextResponse.json(item);
}

// 刪除跑馬燈訊息
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.marqueeMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
