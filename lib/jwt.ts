// /lib/jwt.ts
import jwt from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  isAdmin?: boolean;
  /** 兼容舊碼路徑 */
  sub?: string;
};

const JWT_SECRET = process.env.JWT_SECRET!;
const DEFAULT_EXPIRES = "7d";

/** 登入用：同時寫入 userId 與 sub，保持舊碼相容 */
export function signJWT(
  payload: { userId: string; isAdmin?: boolean },
  expiresIn: string = DEFAULT_EXPIRES
): string {
  const { userId, isAdmin } = payload;
  // 同時放 userId 與 sub（= userId）
  return jwt.sign({ userId, isAdmin, sub: userId }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn,
  });
}

/** 驗證 JWT（Promise 版，供舊碼 `await ... .catch()` 使用） */
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const raw = jwt.verify(token, JWT_SECRET) as any;
    // 正規化 payload：若只有 sub，也補 userId；反之亦然
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

/** 從 Request 取出 Bearer/Cookie token（舊新皆適用） */
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

/** 給 route 端直接用的同步驗證（不影響已改好的檔案） */
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
