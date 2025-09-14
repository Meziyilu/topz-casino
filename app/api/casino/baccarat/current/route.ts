import { NextResponse } from "next/server";
import { getCurrentWithMyBets } from "@/services/baccarat.service";

function getUserId(req: Request) {
  return req.headers.get("x-user-id") || "demo-user";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") || "R30") as any;
  const userId = getUserId(req);
  const data = await getCurrentWithMyBets(userId, room);
  return NextResponse.json(data);
}
