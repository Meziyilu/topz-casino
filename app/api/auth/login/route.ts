// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic'; // 避免 Next 靜態分析誤判
// export const runtime = 'nodejs'; // 可選：強制 Node 端執行

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// 讀取 ENV（請在 Render / 本機 .env 設定）
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET;
const ACCESS_TTL = process.env.JWT_EXPIRES || '15m';   // 例：'15m'
const REFRESH_TTL = process.env.REFRESH_EXPIRES || '7d'; // 例：'7d'
const VERIFY_MODE = (process.env.EMAIL_VERIFICATION_MODE || 'strict').toLowerCase(); // 'strict' | 'soft'

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (req as any).ip ||
    req.headers.get('x-real-ip') ||
    null
  );
}

// 解析 body：支援 JSON / form-data
async function parseBody(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  if (isJson) {
    return await req.json();
  }
  const fd = await req.formData();
  // 用 Array.from(entries()) 避免 TS 對 FormData 的型別誤判
  return Object.fromEntries(Array.from(fd.entries()));
}

export async function POST(req: NextRequest) {
  try {
    const raw = await parseBody(req);
    const parsed = LoginSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    // 只選需要的欄位，避免拉過多資料
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        isAdmin: true,
        isBanned: true,
        emailVerifiedAt: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // 帳號存在性
    if (!user) {
      // 不要暴露是帳號還是密碼錯，統一回應
      return NextResponse.json(
        { ok: false, code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' },
        { status: 401 },
      );
    }

    // 封禁檢查
    if (user.isBanned) {
      return NextResponse.json(
        { ok: false, code: 'ACCOUNT_BANNED', message: '帳號已被封禁' },
        { status: 403 },
      );
    }

    // 密碼驗證
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' },
        { status: 401 },
      );
    }

    // Email 驗證模式
    if (VERIFY_MODE === 'strict' && !user.emailVerifiedAt) {
      return NextResponse.json(
        { ok: false, code: 'EMAIL_UNVERIFIED', message: '請先完成 Email 驗證' },
        { status: 403 },
      );
    }

    const isVerified = !!user.emailVerifiedAt;

    // 簽發 Access / Refresh Tokens
    const accessPayload = {
      uid: user.id,
      isAdmin: user.isAdmin,
      isVerified,
    };
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL });

    const refreshPayload = {
      uid: user.id,
      typ: 'refresh',
    };
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

    // 設置 Cookies
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        isVerified,
      },
    });

    // 以秒為單位的 maxAge
    const accessMaxAge =
      typeof ACCESS_TTL === 'string' && ACCESS_TTL.endsWith('m')
        ? parseInt(ACCESS_TTL) * 60
        : 15 * 60; // fallback 15m
    const refreshMaxAge =
      typeof REFRESH_TTL === 'string' && REFRESH_TTL.endsWith('d')
        ? parseInt(REFRESH_TTL) * 24 * 60 * 60
        : 7 * 24 * 60 * 60; // fallback 7d

    res.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: accessMaxAge,
    });

    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: refreshMaxAge,
    });

    // 更新登入時間 / IP（不影響回應速度，等候即可；需要可改成 fire-and-forget）
    const ip = getClientIp(req);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
      select: { id: true }, // 減少傳輸
    });

    return res;
  } catch (err) {
    console.error('[LOGIN_ERR]', err);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '系統忙碌，請稍後再試' },
      { status: 500 },
    );
  }
}
