// app/api/upload/avatar-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, R2_BUCKET, R2_PUBLIC_BASE_URL } from "@/lib/r2";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });
    }
    const { fileName, contentType, size } = json as {
      fileName?: string;
      contentType?: string;
      size?: number;
    };

    if (!fileName || !contentType || !size) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // 允許的 MIME 類型
    const ALLOWED = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/avif",
    ]);

    if (!ALLOWED.has(contentType)) {
      return NextResponse.json({ ok: false, error: "UNSUPPORTED_TYPE" }, { status: 400 });
    }
    if (size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    // 產生 key：以 user-id/年月日/隨機字樣組成
    const ext = fileName.includes(".") ? fileName.substring(fileName.lastIndexOf(".") + 1) : "png";
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 10);
    const key = `avatars/${auth.id}/${yyyy}/${mm}/${dd}/${rand}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      // 這些 metadata 可留空
      // ACL: "public-read", // R2 不用 ACL，權限靠 bucket 設定
    });

    // 簽名 URL（有效 5 分鐘）
    const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 5 });

    // 若你開了 Public Base URL
    const publicUrl = R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${key}` : "";

    // 一些 R2 要求的 header（大部分情況 Content-Type 就夠了）
    const headers = { "Content-Type": contentType };

    return NextResponse.json({ ok: true, uploadUrl, key, publicUrl, headers });
  } catch (err: any) {
    console.error("PRESIGN_ERROR", err?.message || err);
    return NextResponse.json({ ok: false, error: "PRESIGN_FAILED" }, { status: 500 });
  }
}
