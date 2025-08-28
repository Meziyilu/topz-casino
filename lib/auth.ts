// lib/auth.ts
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export type AuthedUser = {
  id: string;
  email: string;
  isAdmin: boolean;
} | null;

/**
 * 從 Request 解析 cookie: token → verifyJWT → 讀 DB 使用者
 * 回傳 { id, email, isAdmin }，無登入則回傳 null
 */
export async function getUserFromRequest(req: Request): Promise<AuthedUser> {
  try {
    const raw = req.headers.get("cookie") || "";
    const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
    if (!m) return null;

    const token = decodeURIComponent(m[1]);
    const payload = await verifyJWT(token).catch(() => null);
    if (!payload?.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true },
    });
    return user;
  } catch {
    return null;
  }
}

/**
 * 需要管理員的 API 可用這個做檢查（可選）
 */
export async function requireAdmin(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me?.isAdmin) {
    throw new Error("需要管理員權限");
  }
  return me;
}
