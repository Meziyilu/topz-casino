// app/api/admin/marquee/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";
import { z } from "zod";

/** 統一：no-store JSON 回應 */
function noStoreJson<T extends object>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

/** Admin 驗證 */
async function requireAdmin(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t || !t.isAdmin) throw new Error("FORBIDDEN");
  return t;
}

/** POST Body schema */
const PostSchema = z.object({
  text: z.string().trim().min(1).max(500),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(999).optional(),
});
type PostInput = z.infer<typeof PostSchema>;

/** GET / 取得全部跑馬燈訊息 */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const list = await prisma.marqueeMessage.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: { id: true, text: true, enabled: true, priority: true, createdAt: true, updatedAt: true },
    });

    return noStoreJson({
      ok: true as const,
      items: list.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return noStoreJson({ ok: false as const, error: "FORBIDDEN" as const }, 403);
    }
    return noStoreJson({ ok: false as const, error: "SERVER_ERROR" as const }, 500);
  }
}

/** POST / 新增跑馬燈訊息 */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return noStoreJson({ ok: false as const, error: "INVALID_CONTENT_TYPE" as const }, 415);
    }

    const raw = await req.json();
    const parsed = PostSchema.safeParse(raw);
    if (!parsed.success) {
      return noStoreJson({ ok: false as const, error: "INVALID_INPUT" as const }, 400);
    }
    const body = parsed.data as PostInput;

    const created = await prisma.marqueeMessage.create({
      data: {
        text: body.text,
        enabled: body.enabled ?? true,
        priority: body.priority ?? 0,
      },
      select: { id: true, text: true, enabled: true, priority: true, createdAt: true, updatedAt: true },
    });

    return noStoreJson({
      ok: true as const,
      item: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return noStoreJson({ ok: false as const, error: "FORBIDDEN" as const }, 403);
    }
    return noStoreJson({ ok: false as const, error: "SERVER_ERROR" as const }, 500);
  }
}
