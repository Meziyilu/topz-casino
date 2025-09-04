// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { clearAuth } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAuth(res);
  return res;
}
