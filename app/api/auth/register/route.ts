export const runtime = "nodejs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "請輸入 Email 與密碼" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "Email 已被註冊" }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, password: hash, name: name?.trim() || null },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "註冊失敗" }, { status: 500 });
  }
}
