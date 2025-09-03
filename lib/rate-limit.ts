import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** 基礎限流（記憶體）: 在 windowSec 內允許 limit 次 */
export function rateLimit(req: Request, key: string, limit = 20, windowSec = 10) {
  const now = Date.now();
  const ip = (req.headers.get("x-forwarded-for") || "ip:unknown").split(",")[0].trim();
  const k = `${key}:${ip}`;

  const b = buckets.get(k);
  if (!b || b.resetAt <= now) {
    buckets.set(k, { count: 1, resetAt: now + windowSec * 1000 });
    return null as const;
  }
  if (b.count < limit) {
    b.count++;
    return null as const;
  }
  const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  return new NextResponse(JSON.stringify({ error: "RATE_LIMITED" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
  });
}
