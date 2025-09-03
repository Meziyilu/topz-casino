import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  clearAuthCookies();
  return NextResponse.json({ ok: true });
}
