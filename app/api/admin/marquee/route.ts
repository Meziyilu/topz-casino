export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { z } from "zod";

const CreateSchema = z.object({
  text: z.string().min(1, "text 必填"),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
});

// GET /api/admin/marquee
export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const items = await prisma.marqueeMessage.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

// POST /api/admin/marquee
export async function POST(req: Request) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const raw = await req.json();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", detail: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const item = await prisma.marqueeMessage.create({
    data: {
      text: b.text,
      enabled: b.enabled ?? true,
      priority: b.priority ?? 0,
    },
  });
  return NextResponse.json(item);
}
