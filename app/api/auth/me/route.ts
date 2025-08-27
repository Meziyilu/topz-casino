import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const payload = await verifyJWT(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    if (!user) return NextResponse.json({ error: "無此使用者" }, { status: 401 });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (e: any) {
    return NextResponse.json({ error: "無效或過期的登入" }, { status: 401 });
  }
}
