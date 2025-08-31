// lib/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// 雜湊密碼
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// 比對密碼
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 簽發 JWT
export async function signJWT(
  payload: Record<string, any>,
  opts?: { expiresIn?: string | number }
): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: opts?.expiresIn ?? "7d" });
}

// 驗證 JWT（回傳 payload）
export async function verifyJWT(token: string): Promise<any> {
  return jwt.verify(token, JWT_SECRET);
}
