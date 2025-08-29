// lib/auth.ts
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export type AuthedUser = { id: string; email: string; isAdmin: boolean } | null;

export async function getUserFromRequest(req: Request): Promise<AuthedUser> {
  try {
    const raw = req.headers.get("cookie") || "";
    const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
    if (!m) return null;
    const token = decodeURIComponent(m[1]);
    const payload = await verifyJWT(token).catch(() => null);
    if (!payload?.sub) return null;

    return await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true },
    });
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me?.isAdmin) throw new Error("需要管理員權限");
  return me;
}
