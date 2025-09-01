import jwt, { SignOptions } from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  isAdmin?: boolean;
  sub?: string; // 舊碼相容
};

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET ?? "changeme");
const DEFAULT_EXPIRES = "7d";

/** 簽發 JWT：同時寫入 userId 與 sub，確保新舊程式都能讀 */
export function signJWT(
  payload: { userId: string; isAdmin?: boolean },
  expiresIn: string | number = DEFAULT_EXPIRES
): string {
  const { userId, isAdmin } = payload;
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: expiresIn as any, // 👈 避免 TS 型別報錯
  };
  return jwt.sign({ userId, isAdmin, sub: userId }, JWT_SECRET, options);
}

/** 驗證 JWT：Promise 版，舊碼可用 await ... .catch */
export function verifyJWT<T extends Partial<AuthPayload> = AuthPayload>(
  token?: string | null
): T | null {
  try {
    if (!token) return null;
    const raw = jwt.verify(token, JWT_SECRET) as any;
    const userId = raw?.userId ?? raw?.sub;
    if (!userId) return null;
    return { userId, isAdmin: !!raw?.isAdmin, sub: raw?.sub ?? userId } as T;
  } catch {
    return null;
  }
}

/** 從 Request 取出 Bearer/Cookie token */
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

/** Route 端專用：同步驗證整個 Request */
export function verifyRequest(req: Request): AuthPayload | null {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return null;
    const raw = jwt.verify(token, JWT_SECRET) as any;
    const userId = raw?.userId ?? raw?.sub;
    if (!userId) return null;
    return { userId, isAdmin: !!raw?.isAdmin, sub: raw?.sub ?? userId };
  } catch {
    return null;
  }
}

