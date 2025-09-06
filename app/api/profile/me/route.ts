import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { HeadframeCode } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true, email: true, avatarUrl: true, isAdmin: true,
        balance: true, bankBalance: true, vipTier: true,
        displayName: true, nickname: true, about: true, country: true,
        headframe: true, panelStyle: true, panelTint: true,
      },
    });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}

const PutSchemaLoose = z.object({
  displayName: z.string().min(1).max(30).optional(),
  nickname: z.string().max(40).optional(),
  about: z.string().max(1000).optional(),
  country: z.string().max(4).optional(),
  avatarUrl: z.string().max(2048).optional(),
  headframe: z.string().max(64).optional(),
  panelStyle: z.string().max(64).optional(),
  panelTint: z.string().max(24).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const isJson = req.headers.get('content-type')?.includes('application/json');
    let raw: any;
    if (isJson) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      raw = {} as Record<string, string>;
      fd.forEach((v, k) => (raw[k] = String(v)));
    }

    // 1) 先把空字串規格化成 undefined（避免被 zod 當「提供了但不合法」）
    for (const k of Object.keys(raw)) {
      if (typeof raw[k] === 'string' && raw[k].trim() === '') {
        delete raw[k];
      }
    }

    // 2) 驗證
    const parsed = PutSchemaLoose.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_PAYLOAD', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // 3) enum 安全轉換
    const headframeEnum = Object.values(HeadframeCode) as string[];
    const headframe =
      data.headframe && headframeEnum.includes(data.headframe)
        ? (data.headframe as HeadframeCode)
        : undefined;

    // 4) 寫入（未提供 = 不更新）
    const user = await prisma.user.update({
      where: { id: auth.id },
      data: {
        displayName: data.displayName ?? undefined,
        nickname: data.nickname ?? undefined,
        about: data.about ?? undefined,
        country: data.country ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
        headframe,                    // 只在有效時更新
        panelStyle: data.panelStyle ?? undefined, // 目前以字串存
        panelTint: data.panelTint ?? undefined,
      },
      select: {
        id: true, email: true, avatarUrl: true, isAdmin: true,
        balance: true, bankBalance: true, vipTier: true,
        displayName: true, nickname: true, about: true, country: true,
        headframe: true, panelStyle: true, panelTint: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_PUT', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
