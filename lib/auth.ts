// lib/auth.ts
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

/** 統一的 cookie 名稱 */
const COOKIE_NAME = "token";
/** JWT 秘鑰（避免 undefined） */
const JWT_SECRET = (process.env.JWT_SECRET || "dev_secret") as jwt.Secret;

/** 驗證後回傳的使用者型別 */
export type AuthUser = {
  id: string;
  isAdmin: boolean;
};

/** 解析 Cookie 字串（支援原生 Request 使用） */
function parseCookie(headerValue?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headerValue) return out;
  for (const seg of headerValue.split(";")) {
    const kv = seg.trim();
    if (!kv) continue;
    const i = kv.indexOf("=");
    if (i <= 0) continue;
    const k = kv.slice(0, i).trim();
    const v = kv.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/**
 * 取得登入者（支援 NextRequest 或原生 Request）
 */
export async function getUserFromRequest(
  req: NextRequest | Request
): Promise<AuthUser | null> {
  try {
    // 1) 從 NextRequest.cookies 或 headers 抓 cookie
    let token: string | undefined;

    const anyReq = req as any;
    if (typeof anyReq?.cookies?.get === "function") {
      token = anyReq.cookies.get(COOKIE_NAME)?.value;
    }

    if (!token) {
      const cookieHeader = req.headers.get("cookie");
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }

    if (!token) return null;

    // 2) 驗證 JWT
    const payload = jwt.verify(token, JWT_SECRET) as {
      uid: string;
      isAdmin?: boolean;
    };

    if (!payload?.uid) return null;
    return { id: payload.uid, isAdmin: !!payload.isAdmin };
  } catch {
    return null;
  }
}

/** ✅ 舊 API 兼容別名 */
export const getUserFromNextRequest = getUserFromRequest;

/** 只拿使用者 id（可未登入） */
export async function getOptionalUserId(
  req: NextRequest | Request
): Promise<string | null> {
  const user = await getUserFromRequest(req);
  return user?.id ?? null;
}

/** 強制需要登入：拿不到就丟錯 */
export async function getUserOrThrow(
  req: NextRequest | Request
): Promise<AuthUser> {
  const u = await getUserFromRequest(req);
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

/** 簡化：只判斷是否登入 */
export async function isAuthed(
  req: NextRequest | Request
): Promise<boolean> {
  const u = await getUserFromRequest(req);
  return !!u;
}
