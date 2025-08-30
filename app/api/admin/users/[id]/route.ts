// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}
function readTokenFromHeaders(req: Request) {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
async function getAdmin(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  const u = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
  return u?.isAdmin ? u : null;
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getAdmin(req);
  if (!me) return noStoreJson({ error: "需要管理員權限" }, 403);

  const userId = params.id;
  await prisma.user.delete({ where: { id: userId } });
  return noStoreJson({ ok: true });
}
