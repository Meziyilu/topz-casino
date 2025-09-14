export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { placeBet } from "@/services/baccarat.service";

export async function POST(req:Request){
  const userId = req.headers.get("x-user-id") || "demo-user"; // 無 JWT，帶入帳號即可
  const body = await req.json() as { room:"R30"|"R60"|"R90"; roundId:string; side:string; amount:number };
  try {
    await placeBet(userId, body.room, body.roundId, body.side as any, Number(body.amount||0));
    return NextResponse.json({ ok:true });
  } catch (e:any){
    return NextResponse.json({ ok:false, error: e.message || "ERR" }, { status: 400 });
  }
}
