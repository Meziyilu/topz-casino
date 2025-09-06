// app/api/upload/avatar-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET, R2_PUBLIC_BASE_URL } from "@/lib/r2";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "INVALID_CONTENT_TYPE" }, { status: 400 });
    }

    const { url, ext: extFromBody } = (await req.json()) as { url?: string; ext?: string };
    if (!url) {
      return NextResponse.json({ ok: false, error: "MISSING_URL" }, { status: 400 });
    }

    // 抓遠端圖片
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "FETCH_SOURCE_FAILED" }, { status: 400 });
    }
    const buf = Buffer.from(await res.arrayBuffer());

    // 決定副檔名
    const srcType = res.headers.get("content-type") || "";
    let ext = (extFromBody || srcType.split("/")[1] || "bin").toLowerCase();
    if (ext.includes(";")) ext = ext.split(";")[0];

    const key = `avatars/${crypto.randomUUID()}.${ext}`;

    // 上傳到 R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: srcType || "application/octet-stream",
        ACL: "private", // 初期用私有，透過 /api/upload/proxy 取檔；日後可切公開
      })
    );

    // 回傳可用的 URL（有 proxy 就用 proxy；有設定 public base 也一併提供）
    const proxyUrl = `/api/upload/proxy?key=${encodeURIComponent(key)}`;
    const publicUrl = R2_PUBLIC_BASE_URL
      ? `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`
      : null;

    return NextResponse.json({ ok: true, key, url: proxyUrl, publicUrl });
  } catch (e: any) {
    console.error("AVATAR_URL_ERROR", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
