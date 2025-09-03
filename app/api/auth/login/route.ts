import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/http';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken'; // ← 用 namespace import，避免 default import 型別混淆
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// 以 jwt.Secret 斷言，消除 undefined 與 overload 歧義
const ACCESS_TTL: jwt.SignOptions['expiresIn'] = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL: jwt.SignOptions['expiresIn'] = process.env.JWT_REFRESH_TTL || '7d';
const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;
const VERIF_MODE = (process.env.EMAIL_VERIFICATION_MODE || 'strict') as 'strict' | 'soft';

function assertSecrets() {
  if (!JWT_SECRET || !REFRESH_SECRET) {
    throw new Error('Missing JWT_SECRET or JWT_REFRESH_SECRET in environment.');
  }
}

function cookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  };
}

async function readBody(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  if (isJson) return await req.json();
  // FormData -> plain object（避免 TS 對 entries 的誤判）
  const fd = await req.formData();
  const map: Record<string, string> = {};
  for (const [k, v] of fd.entries()) map[k] = String(v);
  return map;
}

export async function POST(req: NextRequest) {
  try {
    assertSecrets();

    const raw = await readBody(req);
    const parsed = LoginSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isAdmin: true,
        isBanned: true,
        emailVerifiedAt: true,
        displayName: true,
      },
    });

    // 不暴露帳號存在與否，仍回 INVALID_CREDENTIALS
    if (!user) {
      await delay(300);
      return NextResponse.json({ ok: false, code: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ ok: false, code: 'BANNED' }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await delay(300);
      return NextResponse.json({ ok: false, code: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    if (VERIF_MODE === 'strict' && !user.emailVerifiedAt) {
      return NextResponse.json({ ok: false, code: 'EMAIL_UNVERIFIED' }, { status: 403 });
    }

    // payload
    const nowUnix = Math.floor(Date.now() / 1000);
    const accessPayload = {
      uid: user.id,
      adm: user.isAdmin ? 1 : 0,
      iat: nowUnix,
      typ: 'access' as const,
    };
    const refreshPayload = {
      uid: user.id,
      iat: nowUnix,
      typ: 'refresh' as const,
    };

    // 正確的 sign overload（第二參數是 jwt.Secret；第三參數是 SignOptions）
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

    // 寫入最近登入
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        emailVerified: !!user.emailVerifiedAt,
      },
    });

    // 設定 cookies
    const accessMaxAge =
      typeof ACCESS_TTL === 'string' ? msToSeconds(ACCESS_TTL) : (ACCESS_TTL as number);
    const refreshMaxAge =
      typeof REFRESH_TTL === 'string' ? msToSeconds(REFRESH_TTL) : (REFRESH_TTL as number);

    res.cookies.set('token', accessToken, cookieOpts(accessMaxAge));
    res.cookies.set('refresh_token', refreshToken, cookieOpts(refreshMaxAge));

    return res;
  } catch (err) {
    console.error('[LOGIN_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 把 like “15m” / “7d” 轉成秒數，供 cookie maxAge 使用
function msToSeconds(val: string | number): number {
  if (typeof val === 'number') return Math.floor(val);
  // 簡易 parser：支援 s/m/h/d
  const m = /^(\d+)(s|m|h|d)$/.exec(val);
  if (!m) return 60 * 15; // fallback 15m
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 60 * 60;
    case 'd':
      return n * 60 * 60 * 24;
    default:
      return 60 * 15;
  }
}
