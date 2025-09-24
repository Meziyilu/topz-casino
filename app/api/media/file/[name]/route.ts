import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const name = params.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const p = path.join(os.tmpdir(), `topz_${name}`);
    const data = await fs.readFile(p);
    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif' ? 'image/gif' : 'image/jpeg';

    return new NextResponse(data, {
      headers: { 'content-type': mime, 'cache-control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
}
