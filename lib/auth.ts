import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import prisma from "./prisma";

export type AuthPayload = { userId: string; isAdmin: boolean; displayName?: string } | null;

export async function verifyRequest(): Promise<AuthPayload> {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isBanned: true, isAdmin: true, displayName: true },
    });
    if (!user || user.isBanned) return null;
    return { userId: payload.sub, isAdmin: !!user.isAdmin, displayName: user.displayName ?? undefined };
  } catch {
    return null;
  }
}
