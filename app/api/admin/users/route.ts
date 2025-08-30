// app/api/admin/users/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const where =
      q.length > 0
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        createdAt: true,
      },
    });

    return noStoreJson({ users });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, e?.status || 500);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { email, password, isAdmin = false, name } = body || {};

    if (!email || !password) {
      return noStoreJson({ error: "email 與 password 為必填" }, 400);
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email: String(email),
        password: hashed,
        isAdmin: Boolean(isAdmin),
        name: name ? String(name) : null,
      },
      select: { id: true, email: true, isAdmin: true, name: true, createdAt: true },
    });

    return noStoreJson({ user });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, e?.status || 500);
  }
}
