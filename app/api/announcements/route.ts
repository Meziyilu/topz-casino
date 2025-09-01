export const runtime = "nodejs";
// app/api/announcement/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 統一：no-store JSON 回應 */
function noStoreJson<T extends object>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

/** 統一：基本請求驗證（GET 專用） */
function verifyRequest(req: Request) {
  if (req.method !== "GET") {
    throw new Error("METHOD_NOT_ALLOWED");
  }
}

/** 嚴格回傳型別 */
type AnnouncementItem = {
  id: string;
  title: string | null;
  content: string | null;
  enabled: boolean;
  createdAt: string; // ISO string
};

type AnnouncementResponse =
  | { ok: true; list: AnnouncementItem[] }
  | { ok: false; error: "METHOD_NOT_ALLOWED" | "SERVER_ERROR" };

export async function GET(req: Request) {
  try {
    verifyRequest(req);

    const rows = await prisma.announcement.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, enabled: true, createdAt: true },
    });

    // 正規化日期為 ISO 字串，避免序列化時區差異
    const list: AnnouncementItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      enabled: r.enabled,
      createdAt: r.createdAt.toISOString(),
    }));

    return noStoreJson<AnnouncementResponse>({ ok: true, list });
  } catch (err) {
    if (err instanceof Error && err.message === "METHOD_NOT_ALLOWED") {
      return noStoreJson<AnnouncementResponse>({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }
    return noStoreJson<AnnouncementResponse>({ ok: false, error: "SERVER_ERROR" }, 500);
  }
}
