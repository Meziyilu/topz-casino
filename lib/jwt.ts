// lib/jwt.ts
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const EXPIRES = process.env.JWT_EXPIRES || "7d";

export async function signJWT(payload: Record<string, any>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES)
    .sign(SECRET);
}

export async function verifyJWT(token: string) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload;
}
