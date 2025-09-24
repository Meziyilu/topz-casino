import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs'; // 需要 Node 環境

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'NO_FILE' }, { status: 400 });

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const id = randomUUID();
    const filePath = path.join(os.tmpdir(), `topz_${id}.${ext}`);
    await fs.writeFile(filePath, buffer);

    // 回傳可讀取 URL
    const url = `/api/media/file/${id}.${ext}`;
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error('MEDIA_UPLOAD', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
