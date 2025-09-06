import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });

  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const arrayBuffer = await out.Body!.transformToByteArray(); // Node18+ API
    return new NextResponse(arrayBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": out.ContentType || "application/octet-stream",
        "Cache-Control": out.CacheControl || "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    console.error("PROXY_GET_ERROR", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", detail: e?.message }, { status: 500 });
  }
}
