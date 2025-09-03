// ==============================
// file: lib/admin-auth.ts
// ==============================
import { cookies } from "next/headers";
import prisma from "./prisma";
import { verifyJWT } from "./jwt";


export type AdminSession = {
userId: string;
email?: string;
name?: string;
isAdmin: boolean;
} | null;


export async function getAdminSession(): Promise<AdminSession> {
const token = cookies().get("token")?.value;
if (!token) return null;
try {
const payload = verifyJWT(token);
if (!payload?.sub) return null;
const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, isAdmin: true } });
if (!user || !user.isAdmin) return null;
return { userId: user.id, email: user.email ?? undefined, name: user.name ?? undefined, isAdmin: true };
} catch {
return null;
}
}