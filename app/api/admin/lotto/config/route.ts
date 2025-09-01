import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function readToken(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").map(s=>s.trim()).find(s=>s.startsWith("token="))?.slice(6) ?? "";
}

export async function GET() {
  const row = await prisma.gameConfig.findUnique({ where: { key: "lotto.config" } });
  return NextResponse.json({ value: row?.value ?? null });
}

export async function POST(req: Request) {
  const p = verifyJWT<{ isAdmin?: boolean }>(readToken(req));
  if (!p?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const value = await req.json();
  const row = await prisma.gameConfig.upsert({
    where: { key: "lotto.config" },
    update: { value },
    create: { key: "lotto.config", value }
  });
  return NextResponse.json({ ok: true, value: row.value });
}
