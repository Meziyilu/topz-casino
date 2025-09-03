import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?verify=missing", url));

  const rec = await prisma.emailVerifyToken.findUnique({ where: { token } });
  if (!rec) return NextResponse.redirect(new URL("/login?verify=invalid", url));
  if (rec.usedAt || rec.expiredAt < new Date()) {
    return NextResponse.redirect(new URL("/login?verify=expired", url));
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerifyToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.redirect(new URL("/login?verify=ok", url));
}
