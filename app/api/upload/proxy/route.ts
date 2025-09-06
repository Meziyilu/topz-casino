// app/api/upload/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return new NextResponse("Missing key", { status: 400 });

    const out = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }));

    const buf = Buffer.from(await out.Body!.transformToByteArray());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": out.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e:any) {
    console.error("PROXY_ERROR", e);
    return new NextResponse("Not Found", { status: 404 });
  }
}
