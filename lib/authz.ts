// lib/authz.ts
import { cookies as readCookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth"; // 這裡會被 auth.ts 的真正實作解析到

export type AuthToken = { userId: string; [k: string]: any } | null;

export async function verifyJWTFromRequest(req: Request): Promise<AuthToken> {
  // 1) Authorization: Bearer <jwt>
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/.exec(h);
  let tokenStr: string | null = m?.[1] || null;

  // 2) HttpOnly Cookie（token/jwt/access_token 任一）
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

/** 取出目前登入使用者（含基本欄位） */
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

/**
 * 後台保護：需要管理員
 * 用法：
 *   const gate = await requireAdmin(req);
 *   if (!gate.ok) return gate.res;
 *   const me = gate.user; // 已驗證的管理員
 */
export async function requireAdmin(req: Request): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>> }
  | { ok: false; res: Response }
> {
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
