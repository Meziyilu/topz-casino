import jwt from "jsonwebtoken";

const ACCESS_TTL_SEC = 15 * 60;          // 15m
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7d

type BaseClaims = { sub: string; isAdmin: boolean; displayName?: string };
const iss = process.env.JWT_ISS || "topzcasino";
const aud = process.env.JWT_AUD || "webapp";

export function signAccessToken(payload: BaseClaims) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TTL_SEC, issuer: iss, audience: aud,
  });
}

export function signRefreshToken(payload: BaseClaims & { jti?: string }) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TTL_SEC, issuer: iss, audience: aud, jwtid: payload.jti,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
    issuer: iss, audience: aud,
  }) as BaseClaims & jwt.JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    issuer: iss, audience: aud,
  }) as BaseClaims & jwt.JwtPayload;
}

export function cookieOptions(maxAgeSec: number) {
  const prod = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: prod, sameSite: "lax" as const, path: "/", maxAge: maxAgeSec };
}
