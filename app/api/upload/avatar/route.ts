// app/api/upload/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_BASE_URL } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ ok: false, error: "BAD_TYPE" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "TOO_LARGE" }, { status: 400 });
    }

    // 檔名與副檔名
    const ext = (() => {
      const m = file.name.match(/\.(png|jpg|jpeg|webp|gif)$/i);
      return m ? m[0].toLowerCase() : ({ "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" } as any)[file.type] || "";
    })();

    const key = `avatars/${auth.id}/${Date.now()}${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    // 上傳到 R2
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type,
      // R2 不吃 ACL: "public-read"，公開請用 Public URL 或自訂網域
    }));

    // 公開 URL（建議啟用 R2 的 Public Development URL，寫在 R2_PUBLIC_BASE_URL）
    const publicUrl = R2_PUBLIC_BASE_URL
      ? `${R2_PUBLIC_BASE_URL}/${key}`
      : `${process.env.R2_ENDPOINT?.replace(/^https?:\/\//, "https://")}/${R2_BUCKET}/${key}`;

    // 回寫到使用者頭像
    await prisma.user.update({
      where: { id: auth.id },
      data: { avatarUrl: publicUrl },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e) {
    console.error("UPLOAD_AVATAR_ERROR", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
