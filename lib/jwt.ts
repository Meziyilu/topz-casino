// lib/jwt.ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "devsecret");
const alg = "HS256";

export async function signJWT(payload: Record<string, any>, expiresIn = "30d") {
  return await new SignJWT(payload).setProtectedHeader({ alg }).setExpirationTime(expiresIn).sign(secret);
}

export async function verifyJWT(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as any;
}
