import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { upsertMarqueeSchema } from "@/lib/validation/admin";

export async function GET(req: Request) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const list = await prisma.marqueeMessage.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const data = upsertMarqueeSchema.parse(body);

  const created = await prisma.marqueeMessage.create({
    data: {
      text: data.text,
      enabled: data.enabled ?? true,
      priority: data.priority ?? 0,
    },
  });
  return NextResponse.json(created);
}
