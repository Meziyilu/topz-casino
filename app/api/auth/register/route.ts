export const runtime = "nodejs";
// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { signJWT } from "@/lib/auth";

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

/** 統一：基本請求驗證 */
function verifyRequest(req: Request) {
  if (req.method !== "POST") {
    throw new Error("METHOD_NOT_ALLOWED");
  }
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }
}

/** 嚴格輸入 Schema（移除 any） */
const RegisterSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, "Password too short"),
  name: z.string().trim().max(64).optional(),
});
type RegisterInput = z.infer<typeof RegisterSchema>;

/** 可選：審計/記錄用的 JSON（示範 Prisma.InputJsonValue） */
function buildAuditMeta(req: Request, email: string): Prisma.InputJsonValue {
  return {
    email,
    ua: req.headers.get("user-agent") || null,
    ip: req.headers.get("x-forwarded-for") || null,
    ts: new Date().toISOString(),
    route: "/api/auth/register",
  };
}

/** 針對 Prisma 唯一鍵錯誤的 runtime type guard（不使用 any） */
function isPrismaUniqueError(err: unknown): err is { code: string; meta?: unknown } {
  return !!err && typeof err === "object" && "code" in err && (err as { code?: unknown }).code === "P2002";
}

export async function POST(req: Request) {
  try {
    verifyRequest(req);

    // 一次讀 body + 嚴格解析
    const raw = await req.json();
    const parsed = RegisterSchema.safeParse(raw);
    if (!parsed.success) {
      return noStoreJson({ ok: false as const, error: "INVALID_INPUT" as const }, 400);
    }
    const { email, password, name } = parsed.data as RegisterInput;

    // 先試查（樂觀，真正防競態在 create 時用唯一鍵）
    const existed = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existed) {
      return noStoreJson({ ok: false as const, error: "EMAIL_TAKEN" as const }, 400);
    }

    // 雜湊密碼
    const hash = await bcrypt.hash(password, 10);

    // 寫入（若此刻被競速撞到，會丟 P2002）
    const user = await prisma.user
      .create({
        data: {
          email,
          password: hash,
          name: name?.trim() || null,
        },
        select: { id: true, isAdmin: true },
      })
      .catch((err) => {
        if (isPrismaUniqueError(err)) {
          // 唯一鍵競態（Email）
          return null;
        }
        throw err;
      });

    if (!user) {
      return noStoreJson({ ok: false as const, error: "EMAIL_TAKEN" as const }, 400);
    }

    // 成功註冊後：簽 JWT（payload 統一 { userId }），僅以 Cookie 回傳
    const token = await signJWT({ userId: user.id });

    const res = noStoreJson({
      ok: true as const,
      userId: user.id,
      isAdmin: user.isAdmin,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // 若要記錄審計，可使用 Prisma.InputJsonValue 的 meta
    // const meta = buildAuditMeta(req, email);
    // await prisma.audit.create({ data: { action: "REGISTER", meta } });

    return res;
  } catch (err) {
    if (err instanceof Error && err.message === "METHOD_NOT_ALLOWED") {
      return noStoreJson({ ok: false as const, error: "METHOD_NOT_ALLOWED" as const }, 405);
    }
    if (err instanceof Error && err.message === "INVALID_CONTENT_TYPE") {
      return noStoreJson({ ok: false as const, error: "INVALID_CONTENT_TYPE" as const }, 415);
    }
    return noStoreJson({ ok: false as const, error: "SERVER_ERROR" as const }, 500);
  }
}
