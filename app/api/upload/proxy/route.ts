// app/api/upload/proxy/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
  }

  try {
    const obj = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );

    // obj.Body 是 Node Readable，轉 Web Stream 回傳
    const body = obj.Body as unknown as Readable;
    const webStream = Readable.toWeb(body);

    const headers = new Headers();
    headers.set("Content-Type", obj.ContentType || "application/octet-stream");
    // 可自行調整快取策略
    headers.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
    if (obj.ETag) headers.set("ETag", obj.ETag.replaceAll('"', ""));
    if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));

    return new Response(webStream, { status: 200, headers });
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode || 500;
    return new Response(JSON.stringify({ error: "Not found or fetch failed" }), { status: code });
  }
}
