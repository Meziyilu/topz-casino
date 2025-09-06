// app/api/upload/proxy/route.ts
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

    const out = await s3Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );

    if (!out.Body) {
      return NextResponse.json({ ok: false, error: "EMPTY_BODY" }, { status: 404 });
    }

    // S3 v3 in Node 環境：Body 具備 transformToByteArray()
    const bytes = await out.Body.transformToByteArray(); // Uint8Array
    const contentType = out.ContentType || "application/octet-stream";
    const contentLength = out.ContentLength ? String(out.ContentLength) : String(bytes.byteLength);

    // ⚠️ 這裡不要用 Buffer，改用 Blob（或 ArrayBuffer）以符合 Web BodyInit
    const blob = new Blob([bytes], { type: contentType });

    return new NextResponse(blob, {
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
