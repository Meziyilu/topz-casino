import jwt from "jsonwebtoken";

export type AuthPayload = { userId: string; isAdmin?: boolean };

const JWT_SECRET = process.env.JWT_SECRET!; // 確保已設定

export function verifyJWT(token: string): AuthPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return payload;
  } catch {
    return null;
  }
}

// 從 Request 取出 Bearer token 或 cookie "token"
export function extractTokenFromRequest(req: Request): string | null {
  // 1) Authorization: Bearer xxx
  const authH = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authH) {
    const m = authH.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1];
  }

  // 2) Cookie: token=xxx;
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const found = cookie.split(";").map(s => s.trim()).find(s => s.startsWith("token="));
    if (found) return decodeURIComponent(found.split("=", 2)[1] || "");
  }
  return null;
}

// 給 route 直接用
export function verifyRequest(req: Request): AuthPayload | null {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifyJWT(token);
}
