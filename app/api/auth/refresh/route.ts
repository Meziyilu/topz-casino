export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'NO_TOKEN' }, { status: 401 });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as { id: string };
    const newToken = jwt.sign({ id: payload.id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('token', newToken, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
    return res;
  } catch (e) {
    console.error('REFRESH', e);
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
  }
}
