export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;
import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/jwt";

export async function POST(req:Request){
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error:"FORBIDDEN" },{status:403});
  return NextResponse.json({ ok:true, note:"Admin actions reserved" });
}
