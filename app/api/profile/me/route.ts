// ✅ 關鍵 3 行：這支 API 會讀 cookies，所以一定要強制動態 & 指定 Node runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// ===== GET /api/profile/me =====
export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        vipTier: true,
        displayName: true,
        nickname: true,
        about: true,
        country: true,
        headframe: true,   // 你的 schema 如為 enum，這裡只是讀取沒問題
        panelStyle: true,  // 若是 enum 也可安全讀取
        panelTint: true,
      },
    });

    if (!user) return NextResponse.json({ ok: false }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}

// ===== PUT /api/profile/me =====
// 備註：這版只更新安全的字串欄位，避免 enum 造成再度型別卡關。
// （之後你若要加 headframe/panelStyle 的 enum 驗證，再說。）
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const isJson = req.headers.get('content-type')?.includes('application/json');
    let raw: Record<string, string> = {};
    if (isJson) {
      raw = (await req.json()) ?? {};
    } else {
      const fd = await req.formData();
      fd.forEach((v, k) => (raw[k] = String(v)));
    }

    const data = {
      displayName: raw.displayName?.trim(),
      nickname: raw.nickname?.trim(),
      about: raw.about?.trim(),
      country: raw.country?.trim(),
      avatarUrl: raw.avatarUrl?.trim(),
      panelTint: raw.panelTint?.trim(),
      // ⚠️ 如需 enum，請之後補 zod + enum 轉換，再塞進 data。這裡先不更新以確保可部署。
      // headframe: raw.headframe
      // panelStyle: raw.panelStyle
    };

    const user = await prisma.user.update({
      where: { id: auth.id },
      data: {
        displayName: data.displayName || undefined,
        nickname: data.nickname || undefined,
        about: data.about || undefined,
        country: data.country || undefined,
        avatarUrl: data.avatarUrl || undefined,
        panelTint: data.panelTint || undefined,
      },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        vipTier: true,
        displayName: true,
        nickname: true,
        about: true,
        country: true,
        headframe: true,
        panelStyle: true,
        panelTint: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_PUT', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
