// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMeFromReq } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const me = await getMeFromReq(req);
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    user: {
      id: me.id,
      email: me.email,
      displayName: me.displayName,
      balance: me.balance,
      bankBalance: me.bankBalance,
      headframe: me.headframe,
      panelStyle: me.panelStyle,
      isAdmin: me.isAdmin,
    },
  });
}
