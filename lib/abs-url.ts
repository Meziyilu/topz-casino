// lib/abs-url.ts
/** 在「非 Request 上下文」(Server Component/SSR/build) 取得絕對網址 */
export function absUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||             // 你手動設定的對外網址
    process.env.RENDER_EXTERNAL_URL ||              // Render 預設（例如 https://xxx.onrender.com）
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT || 3000}`
      : "");

  if (!base) throw new Error("ABS_URL_BASE_MISSING");
  return new URL(path, base).toString();
}

/** 在「Route Handler」裡已有 Request，可用這個從 header/forwarded 推 base */
export function absUrlFromRequest(req: Request, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const hdr = (name: string) => req.headers.get(name) || "";
  const host =
    hdr("x-forwarded-host") ||
    hdr("x-forwarded-server") ||
    hdr("host");
  const proto = hdr("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;
  return new URL(path, base).toString();
}
