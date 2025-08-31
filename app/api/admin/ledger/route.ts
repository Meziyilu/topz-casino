import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth"; // 保持原 import

export const dynamic = "force-dynamic";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

  const items = await prisma.ledger.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return noStoreJson({ ok: true, data: { items } });
}
