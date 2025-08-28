// app/api/admin/rooms/reset/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// ---- 修正：用 headers 解析 token，避免 TS 對 null 的推斷問題 ----
function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  // 抓 token=...; 的值
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function requireAdmin(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;

  try {
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true },
    });
    if (!me || !me.isAdmin) return null;
    return me;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return noStoreJson({ error: "需要管理員權限" }, 403);

    await prisma.$transaction(async (tx) => {
      await tx.ledger.deleteMany();
      await tx.bet.deleteMany();
      await tx.round.deleteMany();
      await tx.room.deleteMany();

      await tx.room.createMany({
        data: [
          { code: "R30", name: "30秒房", durationSeconds: 30 },
          { code: "R60", name: "60秒房", durationSeconds: 60 },
          { code: "R90", name: "90秒房", durationSeconds: 90 },
        ],
        skipDuplicates: true,
      });

      const rooms = await tx.room.findMany({
        where: { code: { in: ["R30", "R60", "R90"] } },
        select: { id: true, code: true },
      });

      const now = new Date();
      for (const r of rooms) {
        await tx.round.create({
          data: {
            roomId: r.id,
            day: now,
            roundSeq: 1,
            phase: "BETTING",
            createdAt: now,
            startedAt: now,
          } as any,
        });
      }
    });

    return noStoreJson({ ok: true, message: "所有房間已重置完成 ✅" });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
