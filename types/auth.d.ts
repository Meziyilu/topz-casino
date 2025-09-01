// types/auth.d.ts
declare module "@/lib/jwt" {
  export type AuthPayload = { sub: string; isAdmin?: boolean } | null;
  export function verifyJWT(arg: Request | string): AuthPayload;
  export function verifyRequest(req: Request): AuthPayload;
}
