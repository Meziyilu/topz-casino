// /lib/jwt.ts
import jwt from "jsonwebtoken";

export type AuthPayload = { userId: string; isAdmin?: boolean };

const JWT_SECRET = process.env.JWT_SECRET!;
const DEFAULT_EXPIRES = "7d";

/** 簽發 JWT（給 /api/auth/login 用） */
export function signJWT(payload: AuthPayload, expiresIn: string = DEFAULT_EXPIRES): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn });
}

/** 驗證 JWT（收 token 字串） */
export function verifyJWT(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/** 從 Request 取出 Bearer token 或 cookie "token" */
export function extractTokenFromRequest(req: Request): string | null {
  const authH = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authH) {
    const m = authH.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1];
  }
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const found = cookie.split(";").map(s => s.trim()).find(s => s.startsWith("token="));
    if (found) return decodeURIComponent(found.split("=", 2)[1] || "");
  }
  return null;
}

/** 直接對 Request 做驗證（route 端使用這個） */
export function verifyRequest(req: Request): AuthPayload | null {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifyJWT(token);
}
