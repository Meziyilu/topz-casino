export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const Schema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { fileName, contentType } = Schema.parse(await req.json());

  const key = `uploads/${me.id}/${Date.now()}-${fileName}`;
  const bucket = process.env.R2_BUCKET!;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
  const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`; // 需在 env 設定對外網址

  return NextResponse.json({ ok: true, uploadUrl: url, publicUrl, key });
}
