// app/api/admin/marquee/[id]/route.ts
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

/** 方法檢查（避免命名衝突） */
function verifyMethod(req: Request, allowed: Array<"PATCH" | "DELETE">) {
  if (!allowed.includes(req.method as any)) throw new Error("METHOD_NOT_ALLOWED");
}

/** Admin 驗證 */
async function requireAdmin(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t || !t.isAdmin) throw new Error("FORBIDDEN");
  return t;
}

/** URL 參數驗證 */
const IdSchema = z.object({ id: z.string().min(1) });

/** PATCH body（部分更新） */
const PatchSchema = z.object({
  text: z.string().trim().max(500).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(999).optional(),
});
type PatchInput = z.infer<typeof PatchSchema>;

/** PATCH / 修改跑馬燈訊息 */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    verifyMethod(req, ["PATCH"]);
    await requireAdmin(req);

    const idParsed = IdSchema.safeParse(ctx.params);
    if (!idParsed.success) return noStoreJson({ ok: false as const, error: "INVALID_ID" as const }, 400);
    const { id } = idParsed.data;

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return noStoreJson({ ok: false as const, error: "INVALID_CONTENT_TYPE" as const }, 415);
    }

    const raw = await req.json();
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) return noStoreJson({ ok: false as const, error: "INVALID_INPUT" as const }, 400);
    const body = parsed.data as PatchInput;

    // 若沒有任何欄位可更新
    if (Object.keys(body).length === 0) {
      return noStoreJson({ ok: false as const, error: "NO_FIELDS" as const }, 400);
    }

    const updated = await prisma.marqueeMessage
      .update({
        where: { id },
        data: body,
        select: { id: true, text: true, enabled: true, priority: true, createdAt: true, updatedAt: true },
      })
      .catch((err) => {
        // P2025 → Not found
        if (err && typeof err === "object" && "code" in err && (err as any).code === "P2025") return null;
        throw err;
      });

    if (!updated) return noStoreJson({ ok: false as const, error: "NOT_FOUND" as const }, 404);

    return noStoreJson({
      ok: true as const,
      item: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "METHOD_NOT_ALLOWED") {
        return noStoreJson({ ok: false as const, error: "METHOD_NOT_ALLOWED" as const }, 405);
      }
      if (err.message === "FORBIDDEN") {
        return noStoreJson({ ok: false as const, error: "FORBIDDEN" as const }, 403);
      }
    }
    return noStoreJson({ ok: false as const, error: "SERVER_ERROR" as const }, 500);
  }
}

/** DELETE / 刪除跑馬燈訊息 */
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    verifyMethod(req, ["DELETE"]);
    await requireAdmin(req);

    const idParsed = IdSchema.safeParse(ctx.params);
    if (!idParsed.success) return noStoreJson({ ok: false as const, error: "INVALID_ID" as const }, 400);
    const { id } = idParsed.data;

    const deleted = await prisma.marqueeMessage
      .delete({ where: { id }, select: { id: true } })
      .catch((err) => {
        if (err && typeof err === "object" && "code" in err && (err as any).code === "P2025") return null;
        throw err;
      });

    if (!deleted) return noStoreJson({ ok: false as const, error: "NOT_FOUND" as const }, 404);

    return noStoreJson({ ok: true as const, id: deleted.id });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "METHOD_NOT_ALLOWED") {
        return noStoreJson({ ok: false as const, error: "METHOD_NOT_ALLOWED" as const }, 405);
      }
      if (err.message === "FORBIDDEN") {
        return noStoreJson({ ok: false as const, error: "FORBIDDEN" as const }, 403);
      }
    }
    return noStoreJson({ ok: false as const, error: "SERVER_ERROR" as const }, 500);
  }
}
