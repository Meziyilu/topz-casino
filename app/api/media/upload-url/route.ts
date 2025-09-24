import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  // 需要以下環境變數（有就用；沒有就回 204 代表沒開）
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

  // 產生簡單的 v4 簽名（PUT）
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const url = `https://${host}/${key}`;

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const service = 's3';
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = 'host';

  const canonicalRequest = [
    'PUT',
    `/${key}`,
    '',
    `host:${host}`,
    '',
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const kDate = crypto.createHmac('sha256', 'AWS4' + secretAccessKey).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const uploadUrl =
    `${url}?X-Amz-Algorithm=${algorithm}` +
    `&X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${credentialScope}`)}` +
    `&X-Amz-Date=${amzDate}` +
    `&X-Amz-Expires=300` +
    `&X-Amz-SignedHeaders=${signedHeaders}` +
    `&X-Amz-Signature=${signature}`;

  return NextResponse.json({
    ok: true,
    uploadUrl,
    cdnUrl: `${cdnBase}/${key}`,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}
