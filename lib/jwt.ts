import jwt, { SignOptions } from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  isAdmin?: boolean;
  /** 向下相容舊碼使用 sub */
  sub?: string;
};

// ✅ secret 包成 Buffer，避免 TS 型別錯誤
const JWT_SECRET = Buffer.from(process.env.JWT_SECRET ?? "changeme");
const DEFAULT_EXPIRES = "7d";

/** 簽發 JWT：同時寫入 userId 與 sub，確保新舊程式都能讀 */
export function signJWT(
  payload: { userId: string; isAdmin?: boolean },
  expiresIn: string = DEFAULT_EXPIRES
): string {
  const { userId, isAdmin } = payload;
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn,
  };
  return jwt.sign({ userId, isAdmin, sub: userId }, JWT_SECRET, options);
}

/** 驗證 JWT：Promise 版，支援 await / .catch */
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const raw = jwt.verify(token, JWT_SECRET) as any;
    const userId = raw?.userId ?? raw?.sub;
    if (!userId) return null;
    return {
      userId,
      isAdmin: !!raw?.isAdmin,
      sub: raw?.sub ?? userId,
    };
  } catch {
    return null;
  }
}

/** 從 Request 抽出 token（header 或 cookie） */
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

/** route 專用：同步驗證 Request */
export function verifyRequest(req: Request): AuthPayload | null {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return null;
    const raw = jwt.verify(token, JWT_SECRET) as any;
    const userId = raw?.userId ?? raw?.sub;
    if (!userId) return null;
    return {
      userId,
      isAdmin: !!raw?.isAdmin,
      sub: raw?.sub ?? userId,
    };
  } catch {
    return null;
  }
}
