// app/api/users/me/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, user });
}
