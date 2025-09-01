// lib/authz.ts — final (aligned with jwt.ts + noStoreJson)
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { noStoreJson } from "@/lib/http";
import { cookies as readCookies } from "next/headers";

/** 標準化後的 Token 型別（對齊 jwt.ts） */
export type AuthToken = { sub: string; isAdmin?: boolean } | null;

/** 從 Request 取出 JWT（Authorization 或 Cookie），並驗簽還原 payload */
export async function verifyJWTFromRequest(req: Request): Promise<AuthToken> {
  // 1) Authorization: Bearer <jwt>
  const auth = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/.exec(auth);
  let token: string | null = m?.[1] || null;

  // 2) Cookie（先從 req.headers，失敗再 fallback 到 next/headers）
  if (!token) {
    const raw = req.headers.get("cookie") || "";
    token =
      parseCookie(raw, "token") ||
      parseCookie(raw, "jwt") ||
      parseCookie(raw, "access_token") ||
      null;

    if (!token) {
      // 某些 runtime（node）才能安全取用 next/headers
      try {
        const c = readCookies();
        token =
          c.get("token")?.value ||
          c.get("jwt")?.value ||
          c.get("access_token")?.value ||
          null;
      } catch {
        // ignore
      }
    }
  }

  if (!token) return null;

  try {
    // 我們的 verifyJWT 已支援傳入字串或 Request
    const payload = await verifyJWT(token);
    if (payload && typeof payload === "object" && "sub" in payload) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

/** 取得目前登入使用者（常用欄位） */
export async function getUserFromRequest(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t?.sub) return null;
  return prisma.user.findUnique({
    where: { id: t.sub },
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
 *   if (!gate.ok) return gate.res; // 401/403 已回傳
 *   const me = gate.user; // 已驗證的管理員
 */
export async function requireAdmin(req: Request): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>> }
  | { ok: false; res: Response }
> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { ok: false, res: noStoreJson({ ok: false, error: "UNAUTH" }, 401) };
  }
  if (!user.isAdmin) {
    return { ok: false, res: noStoreJson({ ok: false, error: "FORBIDDEN" }, 403) };
  }
  return { ok: true, user };
}

/* ---------------------------------------------------- */
/* helpers                                              */
/* ---------------------------------------------------- */
function parseCookie(raw: string, key: string): string | null {
  // 簡易 cookie 解析，避免引入額外套件
  // raw 形如: "a=1; token=abc.def.ghi; x=y"
  const parts = raw.split(";").map((s) => s.trim());
  const kv = parts.find((p) => p.startsWith(key + "="));
  if (!kv) return null;
  const eq = kv.indexOf("=");
  return eq >= 0 ? decodeURIComponent(kv.slice(eq + 1)) : null;
}
