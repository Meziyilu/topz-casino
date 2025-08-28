// lib/jwt.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev_secret");
const COOKIE_NAME = "token";

export async function signJWT(payload: Record<string, any>, expiresIn = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

export async function verifyJWT(token: string) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload;
}

export async function getTokenFromCookie() {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value ?? null;
}
