export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(1, "title 必填"),
  body: z.string().min(1, "body 必填"),
  enabled: z.boolean().optional(),
});

// GET /api/admin/announcement
export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const items = await prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

// POST /api/admin/announcement
export async function POST(req: Request) {
  const auth = await verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const raw = await req.json();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", detail: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const item = await prisma.announcement.create({
    data: {
      title: b.title,
      body: b.body,
      enabled: b.enabled ?? true,
    },
  });
  return NextResponse.json(item);
}
