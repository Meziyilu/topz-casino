// 強制動態，不參與靜態預算
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  clearAuthCookies();
  return NextResponse.json({ ok: true });
}
