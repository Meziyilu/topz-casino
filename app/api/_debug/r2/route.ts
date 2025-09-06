// app/api/_debug/r2/route.ts
import { NextResponse } from "next/server";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = `ping/ping-${Date.now()}.txt`;
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: Buffer.from("ping"),
      ContentType: "text/plain",
    }));
    await s3Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return NextResponse.json({ ok: true, key });
  } catch (e:any) {
    console.error("R2_DEBUG_ERROR", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
