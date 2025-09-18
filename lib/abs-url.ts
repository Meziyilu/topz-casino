// lib/abs-url.ts
export function absUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // 優先順序：NEXT_PUBLIC_APP_ORIGIN → VERCEL_URL → RENDER_EXTERNAL_URL → APP_ORIGIN
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    "";

  // base 若為空，就回傳相對路徑（在 Next 14 RSC 也能運作）
  return base ? new URL(path, base).toString() : path;
}
