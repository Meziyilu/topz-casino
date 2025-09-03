import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { parseFormData } from "@/lib/form";

export async function POST(req: NextRequest) {
  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : await parseFormData(req);

  const { email, password, displayName, referralCode } = body;

  if (!email || !password || !displayName) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      displayName,
      referralCode: referralCode || undefined,
    },
  });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
