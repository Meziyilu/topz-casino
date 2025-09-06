// app/api/upload/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { s3, R2_BUCKET } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });
    }

    const out = await s3.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    );

    // 取得檔案內容
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": out.ContentType || "application/octet-stream",
        "Cache-Control": out.CacheControl || "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("R2_PROXY_ERROR", err);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
