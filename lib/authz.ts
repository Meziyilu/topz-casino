import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/jwt";

/** 確認已登入，回傳 null 表示通過；否則回 401 Response */
export function ensureUser(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.sub) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return null as const;
}

/** 確認管理員，回傳 null 表示通過；否則回 403 Response */
export function ensureAdmin(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null as const;
}
