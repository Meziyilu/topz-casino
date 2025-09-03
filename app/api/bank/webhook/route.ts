import { NextResponse } from 'next/server';
// 第三方金流回呼可在此校驗與入帳，略
export async function POST() { return NextResponse.json({ ok: true }); }