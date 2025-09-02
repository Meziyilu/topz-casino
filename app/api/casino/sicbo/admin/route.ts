export const runtime="nodejs"; export const revalidate=0; export const dynamic="force-dynamic";
import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/jwt";
// 這裡簡化，只回傳可用；完整的「強制開獎/鎖單」若要落地，請在 lib/sicbo/room.ts 加管理鉤子

export async function POST(req: Request){
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return NextResponse.json({ error:"FORBIDDEN" }, { status:403 });
  // 預留：action: lock/roll/settle，room: R30|R60|R90
  return NextResponse.json({ ok: true, note: "Admin hooks reserved. (Lock/Roll/Settle) Add as needed." });
}
