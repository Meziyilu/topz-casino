// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

// PATCH /api/admin/users/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await verifyJWT(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await req.json();
  const { isAdmin } = body;

  const u = await prisma.user.update({
    where: { id },
    data: { isAdmin: Boolean(isAdmin) },
  });

  return NextResponse.json({ user: u });
}

// DELETE /api/admin/users/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await verifyJWT(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
