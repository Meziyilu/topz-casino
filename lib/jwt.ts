// ==============================
export function signJWT(payload: SessionPayload, expiresInSec = 60 * 60 * 24 * 7): string {
return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: expiresInSec });
}


export function verifyJWT(token: string): SessionPayload {
const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
// jsonwebtoken returns `string | jwt.JwtPayload`; normalize to SessionPayload
if (typeof decoded === "string") throw new Error("Invalid JWT payload");
return {
sub: String(decoded.sub),
email: typeof decoded.email === "string" ? decoded.email : undefined,
name: typeof decoded.name === "string" ? decoded.name : undefined,
isAdmin: Boolean((decoded as any).isAdmin),
};
}


export function readTokenFromHeaders(req: Request | NextRequest): string | null {
const auth = req.headers.get("authorization") || req.headers.get("Authorization");
if (auth && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
const cookie = (req.headers.get("cookie") || req.headers.get("Cookie") || "");
const m = cookie.match(/(?:^|; )token=([^;]+)/);
return m ? decodeURIComponent(m[1]) : null;
}


export function readTokenFromCookies(): string | null {
try {
const c = cookies();
const token = c.get("token")?.value;
return token ?? null;
} catch {
return null;
}
}


export type VerifiedRequest = (SessionPayload & { token: string }) | null;


/**
* verifyRequest: extract JWT from Authorization: Bearer or cookie `token`.
* Returns `null` if missing/invalid.
*/
export function verifyRequest(req: Request | NextRequest): VerifiedRequest {
const token = readTokenFromHeaders(req);
if (!token) return null;
try {
const payload = verifyJWT(token);
return { ...payload, token };
} catch {
return null;
}
}