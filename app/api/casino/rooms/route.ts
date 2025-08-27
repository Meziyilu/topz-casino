import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { durationSeconds: "asc" },
      select: { id: true, code: true, name: true, durationSeconds: true }
    });
    return NextResponse.json(rooms);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
