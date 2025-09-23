// app/api/admin/lobby-popups/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { parseLocalDateTime } from "@/lib/datetime";

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const enabled = url.searchParams.get("enabled");

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }
  if (enabled === "1") where.enabled = true;
  if (enabled === "0") where.enabled = false;

  const [items, total] = await Promise.all([
    prisma.lobbyPopup.findMany({
      where,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.lobbyPopup.count({ where }),
  ]);

  return NextResponse.json({ items, total }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json();
  const data = {
    code: body.code || undefined,
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    startAt: parseLocalDateTime(body.startAt),
    endAt: parseLocalDateTime(body.endAt),
    priority: Number(body.priority ?? 100),
    enabled: Boolean(body.enabled ?? true),
  };

  if (!data.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const created = await prisma.lobbyPopup.create({ data });
  return NextResponse.json({ item: created }, { headers: { "cache-control": "no-store" } });
}
