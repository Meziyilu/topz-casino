import { SignJWT, jwtVerify } from "jose";

const ENC = new TextEncoder();

export async function signJWT(payload: Record<string, any>) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(ENC.encode(secret));
}

export async function verifyJWT(token: string): Promise<Record<string, any>> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  const { payload } = await jwtVerify(token, ENC.encode(secret));
  return payload as Record<string, any>;
}
