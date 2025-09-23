export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

const AnnouncementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  enabled: z.boolean().optional(),
  startAt: emptyToUndef(z.coerce.date().optional()),
  endAt: emptyToUndef(z.coerce.date().optional()),
});

async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null as any;
}

export async function GET(req: NextRequest) {
  const forbid = await requireAdmin(req);
  if (forbid) return forbid;

  const { searchParams } = new URL(req.url);
  const enabled = searchParams.get("enabled");
  const q = searchParams.get("q")?.trim();

  const where: any = {};
  if (enabled === "true") where.enabled = true;
  if (enabled === "false") where.enabled = false;
  if (q) where.OR = [{ title: { contains: q } }, { body: { contains: q } }];

  const items = await prisma.announcement.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const forbid = await requireAdmin(req);
  if (forbid) return forbid;

  const json = await req.json();
  const data = AnnouncementSchema.parse(json);

  const row = await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      enabled: data.enabled ?? true,
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
    },
  });

  return NextResponse.json({ item: row });
}
