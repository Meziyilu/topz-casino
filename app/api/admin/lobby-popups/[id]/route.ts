// app/api/admin/lobby-popups/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { parseLocalDateTime } from "@/lib/datetime";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requireAdmin();
  const id = params.id;

  const body = await req.json();
  const data: any = {};
  if ("code" in body) data.code = body.code || null;
  if ("title" in body) data.title = String(body.title ?? "");
  if ("body" in body) data.body = String(body.body ?? "");
  if ("startAt" in body) data.startAt = parseLocalDateTime(body.startAt);
  if ("endAt" in body) data.endAt = parseLocalDateTime(body.endAt);
  if ("priority" in body) data.priority = Number(body.priority ?? 100);
  if ("enabled" in body) data.enabled = Boolean(body.enabled);

  const updated = await prisma.lobbyPopup.update({
    where: { id },
    data,
  });

  return NextResponse.json({ item: updated }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await requireAdmin();
  const id = params.id;
  await prisma.lobbyPopup.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
