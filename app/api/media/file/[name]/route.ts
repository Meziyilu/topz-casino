// app/api/media/file/[name]/route.ts
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const name = params.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const p = path.join(os.tmpdir(), `topz_${name}`);

    // 讀出 Node Buffer
    const buf = await fs.readFile(p);

    // 轉成 Uint8Array（BodyInit 支援）
    const bytes = new Uint8Array(buf);

    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === '.png'  ? 'image/png'  :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif'  ? 'image/gif'  :
                        'image/jpeg';

    return new Response(bytes, {
      headers: {
        'content-type': mime,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
}
