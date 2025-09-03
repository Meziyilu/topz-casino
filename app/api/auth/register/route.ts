export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function json(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" }});
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "ip";
  if (!rateLimit(`reg:${ip}`, 5, 10 * 60 * 1000)) return json({ error: "RATE_LIMITED" }, 429);

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return json({ error: "INVALID", details: parsed.error.flatten() }, 400);
  const { email, password, displayName, referralCode } = parsed.data;

  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { displayName }] }, select: { id: true }});
  if (exists) return json({ error: "EMAIL_OR_NAME_TAKEN" }, 409);

  const inviter = referralCode ? await prisma.user.findFirst({ where: { referralCode } }) : null;

  const hash = await bcrypt.hash(password, 12);
  const myReferral = crypto.randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);

  const adminList = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminList.includes(email);

  const ua = req.headers.get("user-agent") || "";
  const ipNow = ip.split(",")[0].trim();

  const user = await prisma.user.create({
    data: {
      email, password: hash, displayName,
      isAdmin,
      referralCode: myReferral,
      inviterId: inviter?.id ?? undefined,
      registeredIp: ipNow,
    },
    select: { id: true, email: true }
  });

  const token = crypto.randomBytes(32).toString("base64url");
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.emailVerifyToken.create({ data: { userId: user.id, token, expiredAt } });

  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const verificationUrl = `${base}/api/auth/verify?token=${token}`;

  return json({ ok: true, verificationUrl });
}
