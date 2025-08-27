import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({ where: { id: String(payload.sub) }, select: { isAdmin: true }});
    if (!me?.isAdmin) return NextResponse.json({ error: "沒有權限" }, { status: 403 });

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const users = await prisma.user.findMany({
      where: q ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name:  { contains: q, mode: "insensitive" } }
        ]
      } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, email: true, name: true, balance: true, bankBalance: true, createdAt: true,
        ledgers: { orderBy: { createdAt: "desc" }, take: 5, select: { id:true, type:true, target:true, delta:true, memo:true, createdAt:true } }
      }
    });

    return NextResponse.json({ users });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
