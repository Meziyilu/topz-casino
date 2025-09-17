export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import prisma from "@/lib/prisma"; import { getUserFromRequest } from "@/lib/auth";
export async function GET(req: Request) {
  const auth = await getUserFromRequest(req).catch(()=>null);
  if (!auth?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id:true, name:true, avatarUrl:true, balance:true, bankBalance:true, diamondBalance:true, ticketBalance:true, gachaTicketBalance:true },
  });
  return NextResponse.json({ me });
}
