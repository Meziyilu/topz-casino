export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const where = q
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
      take: 50,
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

    return NextResponse.json({ users });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e.message || "Server error" }, { status });
  }
}
