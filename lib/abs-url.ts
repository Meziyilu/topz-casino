// lib/abs-url.ts
/** 在 RSC/SSR/build 環境把相對路徑轉絕對 URL */
export function absUrl(path: string) {
  if (!path) throw new Error("ABS_URL_EMPTY_PATH");
  if (/^https?:\/\//i.test(path)) return path;
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT || 3000}`
      : "");
  if (!base) throw new Error("ABS_URL_BASE_MISSING");
  return new URL(path, base).toString();
}

/** 在 Route Handler 已有 Request 時，從 header 推得基底網址（若你真的需要轉呼叫） */
export function absUrlFromRequest(req: Request, path: string) {
  if (!path) throw new Error("ABS_URL_EMPTY_PATH");
  if (/^https?:\/\//i.test(path)) return path;
  const h = (k: string) => req.headers.get(k) || "";
  const host = h("x-forwarded-host") || h("host");
  const proto = h("x-forwarded-proto") || "https";
  if (!host) throw new Error("ABS_URL_HOST_MISSING");
  return new URL(path, `${proto}://${host}`).toString();
}
