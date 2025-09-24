// app/api/social/wall/upload-url/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// 僅在 Node.js 端載入 AWS SDK，避免任何可能的 Edge 誤判
const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

const Schema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

function getEnvStrict(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    const { fileName, contentType } = Schema.parse(await req.json());

    // 嚴格讀 env；缺少就丟 500，避免 TS 對 undefined 叫
    const R2_ENDPOINT = getEnvStrict('R2_ENDPOINT');
    const R2_ACCESS_KEY_ID = getEnvStrict('R2_ACCESS_KEY_ID');
    const R2_SECRET_ACCESS_KEY = getEnvStrict('R2_SECRET_ACCESS_KEY');
    const R2_BUCKET = getEnvStrict('R2_BUCKET');
    const R2_PUBLIC_BASE = getEnvStrict('R2_PUBLIC_BASE');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    const key = `uploads/${me.id}/${Date.now()}-${fileName}`;
    const cmd = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });

    const uploadUrl: string = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
    const publicUrl = `${R2_PUBLIC_BASE}/${key}`;

    return NextResponse.json({ ok: true, uploadUrl, publicUrl, key });
  } catch (err: any) {
    console.error('UPLOAD_URL_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
