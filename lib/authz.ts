// lib/authz.ts
import { verifyJWT } from "@/lib/jwt";

/** 從 Request 讀 Authorization bearer，交給你現有的 verifyJWT(token) */
export async function verifyJWTFromRequest(req: Request): Promise<{ userId: string } | null> {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/.exec(h);
  if (!m) return null;
  try {
    // 你的 verifyJWT 很可能是 (token: string) => Promise<{ userId: string }>
    return await (verifyJWT as any)(m[1]);
  } catch {
    return null;
  }
}
