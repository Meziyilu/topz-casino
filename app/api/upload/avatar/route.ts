import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, R2_BUCKET, R2_PUBLIC_BASE_URL } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });

    const buf = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,                                    // 用 Uint8Array
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
      // 不要設定 ACL
    }));

    const url = R2_PUBLIC_BASE_URL
      ? `${R2_PUBLIC_BASE_URL}/${key}`
      : `/api/upload/proxy?key=${encodeURIComponent(key)}`;

    return NextResponse.json({ ok: true, key, url });
  } catch (e: any) {
    // 把真正錯因丟回前端，方便你看到（同時也打到 server log）
    console.error("UPLOAD_AVATAR_ERROR", e);
    return NextResponse.json({
      ok: false,
      error: "INTERNAL_ERROR",
      detail: e?.message || String(e),
      name: e?.name,
      code: e?.code,
      http: e?.$metadata?.httpStatusCode,
    }, { status: 500 });
  }
}
