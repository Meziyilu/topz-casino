export const runtime = "nodejs";
// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 統一：no-store JSON 回應 */
function noStoreJson<T extends object>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

/** 統一：基本請求驗證 */
function verifyRequest(req: Request) {
  if (req.method !== "GET") {
    throw new Error("METHOD_NOT_ALLOWED");
  }
}

export async function GET(req: Request) {
  try {
    verifyRequest(req);

    const tokenPayload = await verifyJWTFromRequest(req);
    if (!tokenPayload) {
      return noStoreJson({ ok: false as const, error: "UNAUTH" as const }, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    if (!user) {
      return noStoreJson({ ok: false as const, error: "NOT_FOUND" as const }, 404);
    }

    return noStoreJson({ ok: true as const, user });
  } catch (err) {
    if (err instanceof Error && err.message === "METHOD_NOT_ALLOWED") {
      return noStoreJson({ ok: false as const, error: "METHOD_NOT_ALLOWED" as const }, 405);
    }
    return noStoreJson({ ok: false as const, error: "SERVER_ERROR" as const }, 500);
  }
}
