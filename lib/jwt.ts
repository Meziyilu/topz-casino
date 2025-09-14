// lib/jwt.ts
import jwt from "jsonwebtoken";

export type AppJwtPayload = {
  sub: string;        // userId
  email?: string;
  displayName?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 為避免 build 期直接炸掉，給一個 fallback，但建議在 .env 設定 JWT_SECRET
    return "dev-secret-change-me";
  }
  return secret;
}

/** 解析 Request header 的 Cookie（避免依賴 Next 專用型別） */
function parseCookie(req: Request): Record<string, string> {
  const raw = req.headers.get("cookie") || "";
  const dict: Record<string, string> = {};
  raw.split(";").forEach((kv) => {
    const i = kv.indexOf("=");
    if (i > -1) {
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      dict[k] = decodeURIComponent(v);
    }
  });
  return dict;
}

/** 從 Header 讀取 Bearer token */
function readBearer(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/** 主要驗證：優先用 Cookie: token，其次 Authorization: Bearer */
export async function verifyJWT(token?: string | null): Promise<AppJwtPayload> {
  if (!token) throw new Error("NO_TOKEN");
  const secret = getJwtSecret();
  const payload = jwt.verify(token, secret) as AppJwtPayload;
  if (!payload?.sub) throw new Error("INVALID_JWT_PAYLOAD");
  return payload;
}

/**
 * 路由常用：驗證 Request，回傳 payload（含 userId / isAdmin）
 * - 來源順序：Cookie: token -> Authorization: Bearer
 * - DEV 後門：NODE_ENV !== 'production' 且 header: x-admin=1 時，給 admin 權限
 */
export async function verifyRequest(req: Request): Promise<{ userId: string; isAdmin: boolean } | null> {
  // DEV 後門（本地/測試環境快速進 admin）
  const isDev = process.env.NODE_ENV !== "production";
  const devAdmin = req.headers.get("x-admin");
  if (isDev && devAdmin === "1") {
    return { userId: "dev-admin", isAdmin: true };
  }

  // 1) Cookie: token
  const cookies = parseCookie(req);
  const cookieToken = cookies["token"];
  // 2) Authorization: Bearer
  const bearerToken = readBearer(req);

  const token = cookieToken || bearerToken;
  try {
    const payload = await verifyJWT(token);
    return { userId: payload.sub, isAdmin: !!payload.isAdmin };
  } catch {
    return null;
  }
}

/** 需要時可用來簽發 JWT（登入時） */
export function signJWT(payload: Omit<AppJwtPayload, "iat" | "exp">, opts?: { expiresIn?: string | number }) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: opts?.expiresIn ?? "15m" });
}
