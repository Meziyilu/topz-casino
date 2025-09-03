import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken'; // 用 namespace import，避免型別混淆
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ✅ 正確寫法：用 `||` 指定預設值，再斷言成對應型別
const ACCESS_TTL = (process.env.JWT_ACCESS_TTL || '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_TTL = (process.env.JWT_REFRESH_TTL || '7d') as jwt.SignOptions['expiresIn'];
const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

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

// FormData 與 JSON 皆可；避免 TS 對 FormData.entries() 的誤判
async function readBody(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  if (isJson) return await req.json();
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

    const nowUnix = Math.floor(Date.now() / 1000);
    const accessPayload = { uid: user.id, adm: user.isAdmin ? 1 : 0, iat: nowUnix, typ: 'access' as const };
    const refreshPayload = { uid: user.id, iat: nowUnix, typ: 'refresh' as const };

    // 正確的 sign overload：第二參數是 jwt.Secret；第三參數是 SignOptions
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

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

    const accessMaxAge = typeof ACCESS_TTL === 'string' ? strTtlToSeconds(ACCESS_TTL) : (ACCESS_TTL as number);
    const refreshMaxAge = typeof REFRESH_TTL === 'string' ? strTtlToSeconds(REFRESH_TTL) : (REFRESH_TTL as number);

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

// 將 "15m" / "7d" 等 TTL 字串轉為秒，供 cookie maxAge 使用
function strTtlToSeconds(val: string | number): number {
  if (typeof val === 'number') return Math.floor(val);
  const m = /^(\d+)(s|m|h|d)$/.exec(val);
  if (!m) return 60 * 15; // fallback 15m
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 60 * 60;
    case 'd': return n * 60 * 60 * 24;
    default:  return 60 * 15;
  }
}
