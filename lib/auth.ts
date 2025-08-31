// lib/auth.ts
import bcrypt from "bcryptjs";
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { cookies as readCookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/** ========== 基本 Auth 工具 ========== */

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** 簽發 JWT（同步簽發 → 包 Promise，避免多載誤判） */
export async function signJWT(
  payload: Record<string, any>,
  opts?: { expiresIn?: string | number }
): Promise<string> {
  const options: SignOptions = {
    expiresIn: (opts?.expiresIn ?? "7d") as unknown as SignOptions["expiresIn"],
  };
  const token = (jwt as any).sign(payload, JWT_SECRET, options) as string;
  return Promise.resolve(token);
}

/** 驗證 JWT（同步驗證 → 包 Promise） */
export async function verifyJWT<T = any>(
  token: string,
  options?: VerifyOptions
): Promise<T> {
  const decoded = (jwt as any).verify(token, JWT_SECRET, options) as T;
  return Promise.resolve(decoded);
}

/** ========== 從 Request 取出 JWT（Bearer 或 Cookie） ========== */

export type AuthToken = { userId: string; [k: string]: any } | null;

export async function verifyJWTFromRequest(req: Request): Promise<AuthToken> {
  // 1) Authorization: Bearer <jwt>
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/.exec(h);
  let tokenStr: string | null = m?.[1] || null;

  // 2) Cookie（token/jwt/access_token 任一）
  if (!tokenStr) {
    try {
      const c = readCookies();
      tokenStr =
        c.get("token")?.value ||
        c.get("jwt")?.value ||
        c.get("access_token")?.value ||
        null;
    } catch {
      // 某些 runtime 無 cookies()，忽略
    }
  }

  if (!tokenStr) return null;
  try {
    const payload = await verifyJWT(tokenStr);
    if (payload && typeof payload === "object" && "userId" in payload) {
      return payload as any;
    }
    return null;
  } catch {
    return null;
  }
}

/** 取得目前登入使用者（常用於一般會員 API） */
export async function getUserFromRequest(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t?.userId) return null;
  return prisma.user.findUnique({
    where: { id: t.userId },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      balance: true,
      bankBalance: true,
      createdAt: true,
    },
  });
}

/** ========== 後台保護：需要管理員（統一回傳型別） ========== */
/**
 * 使用方式：
 *   const gate = await requireAdmin(req);
 *   if (!gate.ok) return gate.res;
 *   const me = gate.user!;
 */
export async function requireAdmin(req: Request): Promise<{
  ok: boolean;
  user?: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>;
  res?: Response;
}> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ ok: false, error: "UNAUTH" }), {
        status: 401,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      }),
    };
  }
  if (!user.isAdmin) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ ok: false, error: "FORBIDDEN" }), {
        status: 403,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      }),
    };
  }
  return { ok: true, user };
}
