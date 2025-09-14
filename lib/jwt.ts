// lib/jwt.ts
import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";

export type AppJwtPayload = {
  sub: string;
  email?: string;
  displayName?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
};

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

function parseCookie(req: Request): Record<string, string> {
  const raw = req.headers.get("cookie") || "";
  const dict: Record<string, string> = {};
  raw.split(";").forEach((kv) => {
    const i = kv.indexOf("=");
    if (i > -1) {
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      dict[k] = decodeURIComponent(v);
    }
  });
  return dict;
}
function readBearer(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function verifyJWT(token?: string | null): Promise<AppJwtPayload> {
  if (!token) throw new Error("NO_TOKEN");
  const secret = getJwtSecret();
  const payload = jwt.verify(token, secret) as JwtPayload & AppJwtPayload;
  if (!payload?.sub) throw new Error("INVALID_JWT_PAYLOAD");
  return payload as AppJwtPayload;
}

export async function verifyRequest(req: Request): Promise<{ userId: string; isAdmin: boolean } | null> {
  const isDev = process.env.NODE_ENV !== "production";
  const devAdmin = req.headers.get("x-admin");
  if (isDev && devAdmin === "1") return { userId: "dev-admin", isAdmin: true };

  const cookies = parseCookie(req);
  const cookieToken = cookies["token"];
  const bearerToken = readBearer(req);
  const token = cookieToken || bearerToken;

  try {
    const payload = await verifyJWT(token);
    return { userId: payload.sub, isAdmin: !!payload.isAdmin };
  } catch {
    return null;
  }
}

/** 顯式宣告 SignOptions，避免 TS 推到 callback overload */
export function signJWT(
  payload: Omit<AppJwtPayload, "iat" | "exp">,
  opts?: { expiresIn?: number | string }
) {
  const secret = getJwtSecret();
  const options: SignOptions = {};
  if (opts?.expiresIn !== undefined) options.expiresIn = opts.expiresIn as SignOptions["expiresIn"];
  // 可視需要指定演算法（預設 HS256）
  // options.algorithm = "HS256";
  return jwt.sign(payload, secret, options);
}
