export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;

import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/jwt";
import SicboService from "@/services/sicbo.service";

export async function GET(req:Request){
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room")||"R60") as "R30"|"R60"|"R90";
  const auth = verifyRequest(req);
  try {
    const dto = await SicboService.getState(room, auth?.userId);
    return NextResponse.json(dto);
  } catch(e:any) {
    return NextResponse.json({ error:e.message }, { status:400 });
  }
}
