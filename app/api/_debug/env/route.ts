import { NextResponse } from "next/server";

export async function GET() {
  const keys = ["DATABASE_URL","JWT_SECRET","JWT_REFRESH_SECRET","JWT_ACCESS_TTL","JWT_REFRESH_TTL","NODE_ENV"];
  const out: Record<string,string> = {};
  for (const k of keys) out[k] = process.env[k] ? "SET" : "MISSING";
  return NextResponse.json({ ok:true, env: out });
}
