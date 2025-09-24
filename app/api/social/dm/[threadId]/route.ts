// app/api/social/dm/[threadId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';

// ====== 臨時記憶體（可運行、可部署；重啟會清空）======
type DmMsg = {
  id: string;
  threadId: string;
  senderId: string;
  senderName?: string | null;
  body: string;
  createdAt: string; // ISO
};

type DmStore = Map<string, DmMsg[]>;

declare global {
  // eslint-disable-next-line no-var
  var __dmStore: DmStore | undefined;
}

// Node/Edge 都可：globalThis 綁定，避免多次初始化
const dmStore: DmStore = globalThis.__dmStore ?? new Map<string, DmMsg[]>();
globalThis.__dmStore = dmStore;

// ====== 驗證 ======
const PostSchema = z.object({
  body: z.string().trim().min(1, '內容不可為空').max(2000, '內容過長'),
});

// 你若要擋圖、連結等，也可在這裡加上白名單/簡單清洗
const sanitize = (s: string) => s.replace(/\u0000/g, '').trim();

// ====== GET：讀取某個 thread 的訊息（預設最近 50 筆）======
export async function GET(
  req: NextRequest,
  ctx: { params: { threadId: string } }
) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { threadId } = ctx.params;
    if (!threadId) {
      return NextResponse.json({ ok: false, error: 'BAD_THREAD' }, { status: 400 });
    }

    const url = new URL(req.url);
    const take = Math.max(1, Math.min(200, parseInt(url.searchParams.get('take') || '50', 10)));
    const cursor = url.searchParams.get('cursor'); // 之後可做游標分頁

    const list = dmStore.get(threadId) ?? [];

    // 簡單按時間排序（新→舊）
    const ordered = [...list].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

    // 先不做游標，直接回傳最後 N 筆
    const items = ordered.slice(-take);

    // 前端目前使用的欄位：id/sender/body/createdAt
    const messages = items.map((m) => ({
      id: m.id,
      sender: m.senderName || m.senderId,
      body: m.body,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ ok: true, messages });
  } catch (e) {
    console.error('DM_THREAD_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}

// ====== POST：在該 thread 發送訊息 ======
export async function POST(
  req: NextRequest,
  ctx: { params: { threadId: string } }
) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { threadId } = ctx.params;
    if (!threadId) {
      return NextResponse.json({ ok: false, error: 'BAD_THREAD' }, { status: 400 });
    }

    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : {};
    const parsed = PostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_PAYLOAD', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = sanitize(parsed.data.body);
    if (!body) {
      return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });
    }

    // 建立訊息（臨時記憶體）
    const nowIso = new Date().toISOString();
    const msg: DmMsg = {
      id: randomUUID(),
      threadId,
      senderId: me.id,
      senderName: (me as any)?.displayName ?? (me as any)?.email ?? me.id,
      body,
      createdAt: nowIso,
    };

    const bucket = dmStore.get(threadId) ?? [];
    bucket.push(msg);
    dmStore.set(threadId, bucket);

    // 回傳給前端（對齊 page.tsx 需要的欄位）
    return NextResponse.json({
      ok: true,
      id: msg.id,
      sender: msg.senderName || msg.senderId,
      body: msg.body,
      createdAt: msg.createdAt,
    });
  } catch (e) {
    console.error('DM_THREAD_POST', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
