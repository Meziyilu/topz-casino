import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { upsertAnnouncementSchema } from "@/lib/validation/admin";

export async function GET(req: Request) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const list = await prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const auth = await verifyJWT(req);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const data = upsertAnnouncementSchema.parse(body);

  const created = await prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      enabled: data.enabled ?? true,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    },
  });
  return NextResponse.json(created);
}
