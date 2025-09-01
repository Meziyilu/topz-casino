export const runtime = "nodejs";
// app/api/admin/announcement/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

/** 方法檢查（避免與現有 verifyRequest 命名衝突） */
function verifyMethod(req: Request, allowed: ("PATCH" | "DELETE")[]) {
  if (!allowed.includes(req.method as any)) {
    throw new Error("METHOD_NOT_ALLOWED");
  }
}

/** URL 參數檢查 */
const IdSchema = z.object({ id: z.string().min(1) });

/** PATCH 輸入 Schema（允許部分更新） */
const PatchSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  content: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  startAt: z.string().datetime().nullable().optional(), // ISO string or null
  endAt: z.string().datetime().nullable().optional(),
});
type PatchInput = z.infer<typeof PatchSchema>;

/** 共用：Admin 驗證 */
async function requireAdmin(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t || !t.userId || !t.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return t;
}

/** PATCH / 修改公告 */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    verifyMethod(req, ["PATCH"]);
    await requireAdmin(req);

    // params 驗證
    const idParsed = IdSchema.safeParse(ctx.params);
    if (!idParsed.success) {
      return noStoreJson({ ok: false as const, error: "INVALID_ID" as const }, 400);
    }
    const { id } = idParsed.data;

    // content-type 檢查
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return noStoreJson({ ok: false as const, error: "INVALID_CONTENT_TYPE" as const }, 415);
    }

    // 一次讀 body + 嚴格解析
    const raw = await req.json();
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return noStoreJson({ ok: false as const, error: "INVALID_INPUT" as const }, 400);
    }
    const body = parsed.data as PatchInput;

    // 映射為 Prisma data（僅提供的欄位才更新）
    const data: Record<string, unknown> = {};
    if ("title" in body) data.title = body.title ?? null;
    if ("content" in body) data.content = body.content ?? null;
    if ("enabled" in body) data.enabled = body.enabled;
    if ("startAt" in body) data.startAt = body.startAt ? new Date(body.startAt) : null;
    if ("endAt" in body) data.endAt = body.endAt ? new Date(body.endAt) : null;

    // 若沒有任何欄位要更新
    if (Object.keys(data).length === 0) {
      return noStoreJson({ ok: false as const, error: "NO_FIELDS" as const }, 400);
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        content: true,
        enabled: true,
        startAt: true,
        endAt: true,
        createdAt: true,
      },
    }).catch((err) => {
      // 將 NotFound 轉成 404
      if (err && typeof err === "object" && "code" in err && (err as any).code === "P2025") {
        return null;
      }
      throw err;
    });

    if (!updated) {
      return noStoreJson({ ok: false as const, error: "NOT_FOUND" as const }, 404);
    }

    // 正規化日期輸出為 ISO
    const result = {
      ...updated,
      startAt: updated.startAt ? updated.startAt.toISOString() : null,
      endAt: updated.endAt ? updated.endAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return noStoreJson({ ok: true as const, item: result });
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

/** DELETE / 刪除公告 */
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    verifyMethod(req, ["DELETE"]);
    await requireAdmin(req);

    const idParsed = IdSchema.safeParse(ctx.params);
    if (!idParsed.success) {
      return noStoreJson({ ok: false as const, error: "INVALID_ID" as const }, 400);
    }
    const { id } = idParsed.data;

    const deleted = await prisma.announcement.delete({
      where: { id },
      select: { id: true },
    }).catch((err) => {
      if (err && typeof err === "object" && "code" in err && (err as any).code === "P2025") {
        return null;
      }
      throw err;
    });

    if (!deleted) {
      return noStoreJson({ ok: false as const, error: "NOT_FOUND" as const }, 404);
    }

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
