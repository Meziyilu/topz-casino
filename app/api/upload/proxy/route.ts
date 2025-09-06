import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ ok: false, error: "MISSING_KEY" }, { status: 400 });
    }

    const out = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (!out.Body) {
      return NextResponse.json({ ok: false, error: "EMPTY_BODY" }, { status: 404 });
    }

    // 取 bytes -> 安全轉成 ArrayBuffer
    const bytes = await out.Body.transformToByteArray(); // Uint8Array
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

    const contentType = out.ContentType || "application/octet-stream";
    const contentLength = out.ContentLength ? String(out.ContentLength) : String(bytes.byteLength);

    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("R2_PROXY_ERROR", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
