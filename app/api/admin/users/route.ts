// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import bcrypt from "bcryptjs";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}
function readTokenFromHeaders(req: Request) {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
async function getAdmin(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  const u = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
  return u?.isAdmin ? u : null;
}

export async function GET(req: Request) {
  const me = await getAdmin(req);
  if (!me) return noStoreJson({ error: "需要管理員權限" }, 403);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, balance: true, bankBalance: true, isAdmin: true, createdAt: true },
  });
  return noStoreJson(users);
}

export async function POST(req: Request) {
  try {
    const me = await getAdmin(req);
    if (!me) return noStoreJson({ error: "需要管理員權限" }, 403);

    const { email, password, isAdmin = false } = await req.json();
    if (!email || !password) return noStoreJson({ error: "缺少 email 或 password" }, 400);

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, isAdmin },
      select: { id: true, email: true, isAdmin: true, createdAt: true },
    });

    return noStoreJson(user);
  } catch (e: any) {
    return noStoreJson({ error: e.message || "Server error" }, 500);
  }
}
