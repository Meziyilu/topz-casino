// Node runtime 才能用 AWS SDK
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 讀環境變數（確保已在 Render 上設定）
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE!; // 例: https://pub-xxxx.r2.dev 或你的 CDN/domain

// R2 S3 端點
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'NO_FILE' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'png';
    const key = `avatars/${randomUUID()}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: file.type || 'application/octet-stream',
      ACL: 'public-read', // 若你的 Bucket 是私有，拿掉這行，改走簽名 URL
    }));

    const url = `${R2_PUBLIC_BASE.replace(/\/+$/, '')}/${key}`;
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error('UPLOAD_AVATAR_ERR', e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
