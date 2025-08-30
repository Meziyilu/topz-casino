// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

// GET /api/admin/users?q=keyword
export async function GET(req: Request) {
  const user = await verifyJWT(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const users = await prisma.user.findMany({
    where: q ? { email: { contains: q, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ users });
}

// POST /api/admin/users
export async function POST(req: Request) {
  const user = await verifyJWT(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "缺少 email 或 password" }, { status: 400 });
  }

  const exist = await prisma.user.findUnique({ where: { email } });
  if (exist) return NextResponse.json({ error: "此 Email 已存在" }, { status: 400 });

  const bcrypt = require("bcryptjs");
  const hashed = await bcrypt.hash(password, 10);

  const u = await prisma.user.create({
    data: { email, password: hashed, balance: 0, bankBalance: 0, isAdmin: false },
  });

  return NextResponse.json({ user: { id: u.id, email: u.email } });
}
