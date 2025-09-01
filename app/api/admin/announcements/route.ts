// app/api/admin/announcements/route.ts
export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

function json<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

// 取得全部公告（管理員）
export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;

  if (!userId) return json({ error: "UNAUTH" } as const, 401);

  const me = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, isAdmin: true },
  });
  if (!me?.isAdmin) return json({ error: "FORBIDDEN" } as const, 403);

  const list = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return json({ items: list } as const);
}

// 新增公告（管理員）
export async function POST(req: Request) {
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;

  if (!userId) return json({ error: "UNAUTH" } as const, 401);

  const me = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, isAdmin: true },
  });
  if (!me?.isAdmin) return json({ error: "FORBIDDEN" } as const, 403);

  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    content?: unknown;
    enabled?: unknown;
    startAt?: unknown;
    endAt?: unknown;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const enabled =
    typeof body.enabled === "boolean" ? body.enabled : body.enabled === undefined ? true : Boolean(body.enabled);

  if (!title) return json({ error: "TITLE_REQUIRED" } as const, 400);
  if (!content) return json({ error: "CONTENT_REQUIRED" } as const, 400);

  const startAt =
    typeof body.startAt === "string" || body.startAt instanceof Date
      ? new Date(body.startAt as any)
      : null;
  const endAt =
    typeof body.endAt === "string" || body.endAt instanceof Date ? new Date(body.endAt as any) : null;

  try {
    const item = await prisma.announcement.create({
      data: { title, content, enabled, startAt, endAt },
    });
    return json(item);
  } catch (e: unknown) {
    return json({ error: "SERVER_ERROR" } as const, 500);
  }
}
