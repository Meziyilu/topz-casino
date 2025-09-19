// app/api/friends/remove/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const Q = z.object({
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
}).refine(d => !!(d.email || d.userId), { message: "email 或 userId 擇一提供" });

export async function POST(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Q.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "BAD_REQUEST" }, { status: 400 });
  }

  const target = parsed.data.userId
    ? await prisma.user.findUnique({ where: { id: parsed.data.userId } })
    : await prisma.user.findUnique({ where: { email: parsed.data.email! } });

  if (!target) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "CANNOT_REMOVE_SELF" }, { status: 400 });

  await prisma.$transaction([
    prisma.friend.deleteMany({ where: { userId: me.id, friendId: target.id } }),
    prisma.friend.deleteMany({ where: { userId: target.id, friendId: me.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
