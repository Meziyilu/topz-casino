// app/api/profile/me/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { HeadframeCode, PanelPreset, Prisma } from '@prisma/client';

/** 允許 null/undefined/空白字串 → undefined，其餘保留原值或去空白 */
const emptyishToUndef = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return undefined;
    return t; // 去頭尾空白
  }
  return v;
};

/** 將空值正規化（null/undefined/空白字串 → undefined），再交給 schema 驗證 */
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => emptyishToUndef(v), schema);

/** 去頭尾空白；空白字串 → undefined */
const trimToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    const n = emptyishToUndef(v);
    return typeof n === 'string' ? n.trim() : n;
  }, schema);

/**
 * enum 正規化：
 * - 接受 "HeadframeCode.GOLD" / "headframecode.gold" / " gold "
 * - 去前綴（. / :）取最後一段
 * - 移除非字母數字底線字元
 * - 轉大寫
 */
const enumNormalize = <E extends Record<string, string>>(EnumObj: E) =>
  z.preprocess((v) => {
    if (v == null) return undefined;
    let s = typeof v === 'string' ? v : String(v);
    s = s.trim();
    const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf('/'), s.lastIndexOf(':'));
    if (lastSep >= 0) s = s.slice(lastSep + 1);
    s = s.replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
    return s || undefined;
  }, z.nativeEnum(EnumObj as unknown as z.EnumLike));

/** 把常見前端別名統一回正式欄位名（例如 headFrame → headframe） */
function normalizeAliases(r: Record<string, any>) {
  const out: Record<string, any> = { ...r };
  // headframe 的別名
  if (out.headFrame && out.headframe === undefined) out.headframe = out.headFrame;
  if (out.frame && out.headframe === undefined) out.headframe = out.frame;
  if (out.avatarFrame && out.headframe === undefined) out.headframe = out.avatarFrame;

  // panelStyle 的別名
  if (out.panel && out.panelStyle === undefined) out.panelStyle = out.panel;
  if (out.style && out.panelStyle === undefined) out.panelStyle = out.style;
  if (out.theme && out.panelStyle === undefined) out.panelStyle = out.theme;

  return out;
}

/** PUT payload 驗證：允許不傳、允許空字串（會正規化為 undefined=不更新） */
const PutSchema = z.object({
  displayName: trimToUndef(z.string().min(2).max(20)).optional(),
  nickname: trimToUndef(z.string().max(30)).optional(),
  about: trimToUndef(z.string().max(200)).optional(),
  country: trimToUndef(
    z
      .string()
      .max(2)
      .transform((s) => (s ? s.toUpperCase() : s))
  ).optional(),
  // 空/空白/無 → 不更新；非空才驗證 URL
  avatarUrl: emptyToUndef(z.string().url()).optional(),
  // 傳 'NONE' 代表重設為預設；空字串代表不更新
  headframe: enumNormalize(HeadframeCode).optional(),
  panelStyle: enumNormalize(PanelPreset).optional(),
  panelTint: trimToUndef(z.string().max(16)).optional(),
});

// ========== GET /api/profile/me ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

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
        headframe: true,
        panelStyle: true,
        panelTint: true,
      },
    });

    if (!user) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}

// ========== PUT /api/profile/me ==========
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

    // 支援 JSON 與 multipart formData
    const isJson = (req.headers.get('content-type') || '').includes('application/json');
    let raw: Record<string, any> = {};
    if (isJson) {
      raw = (await req.json()) ?? {};
    } else {
      const fd = await req.formData();
      fd.forEach((v, k) => (raw[k] = typeof v === 'string' ? v : String(v)));
    }

    // 1) 欄位別名正規化（headFrame → headframe 等）
    raw = normalizeAliases(raw);

    // （開發用除錯）
    if (process.env.NODE_ENV !== 'production') {
      console.log('PROFILE_ME_PUT raw keys:', Object.keys(raw));
      console.log('PROFILE_ME_PUT headframe/panelStyle:', raw.headframe, raw.panelStyle);
    }

    // 2) 驗證與正規化
    const parsed = PutSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('PROFILE_ME_PUT_BAD_PAYLOAD', parsed.error.flatten());
      return NextResponse.json(
        { ok: false, error: 'BAD_PAYLOAD', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // 3) 準備更新資料：undefined = 不更新
    const updateData: Prisma.UserUpdateInput = {
      displayName: data.displayName ?? undefined,
      nickname: data.nickname ?? undefined,
      about: data.about ?? undefined,
      country: data.country ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      headframe: data.headframe ?? undefined,     // 'GOLD' | 'NONE' | undefined
      panelStyle: data.panelStyle ?? undefined,   // 'GLASS_DARK' 等 | undefined
      panelTint: data.panelTint ?? undefined,
    };

    // 4) 更新並回傳最新資料
    const user = await prisma.user.update({
      where: { id: auth.id },
      data: updateData,
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
