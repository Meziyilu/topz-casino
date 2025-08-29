// lib/auth.ts
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export type AuthedUser = { id: string; email: string; isAdmin: boolean } | null;

function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function getUserFromRequest(req: Request): Promise<AuthedUser> {
  try {
    const token = readTokenFromHeaders(req);
    if (!token) return null;
    const payload = await verifyJWT(token).catch(() => null);
    if (!payload?.sub) return null;
    const u = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true },
    });
    return u || null;
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me?.isAdmin) {
    const err = new Error("需要管理員權限");
    // @ts-ignore
    err.status = 403;
    throw err;
  }
  return me;
}
