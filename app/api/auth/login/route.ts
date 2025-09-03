import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ===== 環境變數 =====
const ACCESS_TTL: jwt.SignOptions["expiresIn"] =
  (process.env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"]) || "15m";
const REFRESH_TTL: jwt.SignOptions["expiresIn"] =
  (process.env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"]) || "7d";
const JWT_SECRET = (process.env.JWT_SECRET || "") as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || "") as jwt.Secret;

// ===== 解析 Request Body（支援 JSON / FormData）=====
async function readBody(req: NextRequest) {
  const isJson = req.headers.get("content-type")?.includes("application/json");
  if (isJson) return await req.json();

  const fd = await req.formData();
  const map: Record<string, string> = {};
  // ✅ 用 forEach 取代 entries()，避免 TS 報錯
  fd.forEach((value, key) => {
    if (typeof value === "string") {
      map[key] = value;
    } else {
      map[key] = value.name ?? "blob";
    }
  });
  return map;
}

// ===== POST: 登入 =====
export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "缺少必要欄位" }, { status: 400 });
    }

    // 查詢使用者
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
    }

    // 驗證狀態
    if (user.isBanned) {
      return NextResponse.json({ ok: false, error: "帳號已被封禁" }, { status: 403 });
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json({ ok: false, error: "Email 尚未驗證" }, { status: 403 });
    }

    // 驗證密碼
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
    }

    // Payload
    const accessPayload = { uid: user.id, typ: "access" as const };
    const refreshPayload = { uid: user.id, typ: "refresh" as const };

    // 簽發 JWT
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

    // 更新登入資訊
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip ?? "unknown",
      },
    });

    // 回應
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });

    // 設定 HttpOnly Cookie
    res.cookies.set("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 15, // 15 分鐘
      path: "/",
    });
    res.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ ok: false, error: "伺服器錯誤" }, { status: 500 });
  }
}
