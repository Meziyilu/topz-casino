export const runtime = "nodejs";
// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

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
  if (req.method !== "POST") {
    throw new Error("METHOD_NOT_ALLOWED");
  }
  const ct = req.headers.get("content-type") || "";
  // logout 不一定要有 body，所以 content-type 允許沒有
  if (ct && !ct.includes("application/json")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }
}

export async function POST(req: Request) {
  try {
    verifyRequest(req);

    const res = noStoreJson({ ok: true as const });

    // 清掉常用三種 cookie 名
    (["token", "jwt", "access_token"] as const).forEach((k) => {
      res.cookies.set(k, "", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
      });
    });

    return res;
  } catch (err) {
    if (err instanceof Error && err.message === "METHOD_NOT_ALLOWED") {
      return noStoreJson({ ok: false, error: "METHOD_NOT_ALLOWED" as const }, 405);
    }
    if (err instanceof Error && err.message === "INVALID_CONTENT_TYPE") {
      return noStoreJson({ ok: false, error: "INVALID_CONTENT_TYPE" as const }, 415);
    }
    return noStoreJson({ ok: false, error: "SERVER_ERROR" as const }, 500);
  }
}
