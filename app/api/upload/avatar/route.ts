// app/api/upload/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET } from "@/lib/r2";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "INVALID_CONTENT_TYPE" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = (file.type?.split("/")[1] || "bin").toLowerCase();
    const key = `avatars/${crypto.randomUUID()}.${ext}`;

    // 上傳到 R2
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
      ACL: "private", // 先私有，用 proxy 取檔；要公開改 bucket policy/CORS + 這裡不要 ACL
    }));

    // 先回「後端 proxy 取檔」的 URL，避免 public base url 設錯
    const url = `/api/upload/proxy?key=${encodeURIComponent(key)}`;
    return NextResponse.json({ ok: true, url, key });
  } catch (e:any) {
    console.error("UPLOAD_AVATAR_ERROR", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
