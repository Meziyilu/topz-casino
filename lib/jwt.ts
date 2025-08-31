import jwt, { SignOptions } from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  isAdmin?: boolean;
  sub?: string; // 向下相容
};

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET ?? "changeme");
const DEFAULT_EXPIRES = "7d";

/** 簽發 JWT */
export function signJWT(
  payload: { userId: string; isAdmin?: boolean },
  expiresIn: string | number = DEFAULT_EXPIRES
): string {
  const { userId, isAdmin } = payload;
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: expiresIn as any, // ✅ 強制斷言，避免 TS 報錯
  };
  return jwt.sign({ userId, isAdmin, sub: userId }, JWT_SECRET, options);
}
