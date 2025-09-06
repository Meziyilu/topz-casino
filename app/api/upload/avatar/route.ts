// app/api/upload/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { s3, R2_BUCKET, r2PublicUrl } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { getUserFromRequest } from "@/lib/auth";

// 重要：這支一定要跑 Node.js（不是 Edge）
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  try {
    // 必須登入
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    // 檔案大小（預設 <= 5MB）
    const size = file.size ?? 0;
    if (size <= 0 || size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    // 檔案型態
    const type = file.type?.toLowerCase() || "";
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ ok: false, error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    // 產生 key
    const ext = EXT_MAP[type] || "bin";
    const rand = crypto.randomBytes(6).toString("hex");
    const key = `avatars/${auth.id}/${Date.now()}-${rand}.${ext}`;

    // 轉成 Buffer 後上傳 R2
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // 產生可供前端使用的 URL（Public Domain 有值則走公網，否則走 proxy）
    const url = r2PublicUrl(key);

    return NextResponse.json({ ok: true, key, url });
  } catch (err) {
    console.error("UPLOAD_AVATAR_ERROR", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
