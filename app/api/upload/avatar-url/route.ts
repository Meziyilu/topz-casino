// app/api/upload/avatar-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { r2Client, R2_BUCKET, R2_PUBLIC_BASE_URL } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const fileName: string = (body?.fileName || "avatar").toString();
    const contentType: string = (body?.contentType || "application/octet-stream").toString();

    // 產 key：avatars/<uid>/<ts>-<rand>.<ext>
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const key = `avatars/${me.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      // 安全起見可以順便限制檔案大小：ContentLength 不適合 presign 時指定，改由前端自行檢查
      ACL: undefined, // R2 不用 ACL；用 public URL 讀即可
    });

    // 簽 60 秒，足夠瀏覽器上傳
    const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 60 });

    // 回傳可公開讀取的 URL（用你的 R2_PUBLIC_BASE_URL）
    const publicUrl = `${R2_PUBLIC_BASE_URL}/${key}`;

    return NextResponse.json({ ok: true, uploadUrl, publicUrl, key });
  } catch (e) {
    console.error("AVATAR_PRESIGN_ERR", e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
