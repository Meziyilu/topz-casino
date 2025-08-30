// lib/auth.ts
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export type AuthedUser =
  | { id: string; email: string; isAdmin: boolean }
  | null;

// 從 Cookie 讀 token → 驗證 → 撈使用者
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

export async function requireAdmin(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me?.isAdmin) {
    const err: any = new Error("需要管理員權限");
    err.status = 403;
    throw err;
  }
  return me;
}
