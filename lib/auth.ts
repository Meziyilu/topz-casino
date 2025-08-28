// lib/auth.ts
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export type AuthedUser =
  | {
      id: string;
      email: string;
      isAdmin: boolean;
      balance?: number;     // 可選：有時需要即時顯示餘額
      bankBalance?: number; // 可選：同上
    }
  | null;

/** 從 Request 解析 cookie: token → verifyJWT → 讀 DB 使用者
 * 回傳 { id, email, isAdmin, (可選)balance, bankBalance }，未登入則回傳 null
 */
export async function getUserFromRequest(req: Request): Promise<AuthedUser> {
  try {
    const raw = req.headers.get("cookie") || "";
    const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
    if (!m) return null;

    const token = decodeURIComponent(m[1]);
    const payload = await verifyJWT(token).catch(() => null);
    if (!payload?.sub) return null;

    // 若不想每次都撈到餘額，可把 balance/bankBalance 從 select 拿掉
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true, balance: true, bankBalance: true },
    });
    return user;
  } catch {
    return null;
  }
}

/** 需要管理員的 API 可用這個做檢查；不是管理員直接丟錯 */
export async function requireAdmin(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me?.isAdmin) {
    throw new Error("需要管理員權限");
  }
  return me;
}
