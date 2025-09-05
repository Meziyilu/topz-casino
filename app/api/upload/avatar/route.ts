// app/api/upload/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ✅ App Router 的正確宣告（取代舊的 export const config=...）
export const runtime = 'nodejs';         // 要用 Node.js 環境（非 Edge）
export const dynamic = 'force-dynamic';  // 這支 API 不預先靜態化
export const maxDuration = 60;           //（可選）長一點的執行時間

/**
 * 目前策略：不用直接上傳檔案，先接受 avatarUrl 並回傳
 * 好處：不用碰硬碟或外部存儲，能馬上串你現有的「填 URL」流程
 * 之後要改 S3/Cloudflare R2，再把這裡改成上傳即可
 */
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    let avatarUrl = '';

    if (ct.includes('application/json')) {
      const j = await req.json();
      avatarUrl = String(j.avatarUrl ?? '');
    } else if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      avatarUrl = String(fd.get('avatarUrl') ?? '');
      // 如果未來要真的上傳檔案：
      // const file = fd.get('file') as File | null;
      // if (file) { ...把 file.arrayBuffer() 上傳到 S3，取得URL後回傳... }
    } else {
      return NextResponse.json({ ok: false, error: 'UNSUPPORTED_CONTENT_TYPE' }, { status: 415 });
    }

    try {
      // 基本 URL 驗證
      const u = new URL(avatarUrl);
      if (!/^https?:/.test(u.protocol)) throw new Error('bad protocol');
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_URL' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, url: avatarUrl });
  } catch (e) {
    console.error('UPLOAD_AVATAR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
