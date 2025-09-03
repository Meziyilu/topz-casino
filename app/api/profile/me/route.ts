import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.sub) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.sub) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });

  const { name } = body as { name?: string };
  try {
    const updated = await prisma.user.update({
      where: { id: auth.sub },
      data: { ...(typeof name === "string" ? { name } : {}) },
      select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
    });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}
