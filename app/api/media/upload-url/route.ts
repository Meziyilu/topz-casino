// app/api/media/upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto, { BinaryLike } from 'crypto';

export const runtime = 'nodejs'; // 需要 Node 的 crypto

// 小工具：HMAC 與 SHA256（明確用 utf8）
function hmacSha256(key: BinaryLike, data: string) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest(); // Buffer
}
function sha256Hex(data: string) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export async function GET(req: NextRequest) {
  // 若沒設定 S3/R2 參數，回 204，前端會 fallback 用本地 /api/media/upload
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const cdnBase = process.env.S3_PUBLIC_BASE; // 例如 https://cdn.example.com

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !cdnBase) {
    return new NextResponse(null, { status: 204 });
  }

  const { searchParams } = new URL(req.url);
  const ext = (searchParams.get('ext') || 'jpg').replace(/[^a-z0-9]/gi, '');
  const key = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const urlPath = `/${key}`;
  const baseUrl = `https://${host}${urlPath}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'; // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  const service = 's3';
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = 'host';

  // Query 參數（Signature 前就要先放）
  const qs = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': '300', // 5 分鐘
    'X-Amz-SignedHeaders': signedHeaders,
  });

  // Canonical request（注意這邊用 UNSIGNED-PAYLOAD）
  const canonicalQueryString = qs.toString();
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    'PUT',
    urlPath,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  // 衍生金鑰（明確用 BinaryLike）
  const kDate    = hmacSha256(('AWS4' + secretAccessKey) as BinaryLike, dateStamp);
  const kRegion  = hmacSha256(kDate as BinaryLike, region);
  const kService = hmacSha256(kRegion as BinaryLike, service);
  const kSigning = hmacSha256(kService as BinaryLike, 'aws4_request');

  const signature = crypto.createHmac('sha256', kSigning as BinaryLike)
    .update(stringToSign, 'utf8')
    .digest('hex');

  qs.set('X-Amz-Signature', signature);
  const uploadUrl = `${baseUrl}?${qs.toString()}`;

  return NextResponse.json({
    ok: true,
    uploadUrl,
    cdnUrl: `${cdnBase}/${key}`,
    headers: { 'Content-Type': 'application/octet-stream' }, // 前端 PUT 用
  });
}
