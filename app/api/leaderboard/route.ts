import { NextResponse } from 'next/server';
import { getTopNetProfit } from '@/services/leaderboard.service';
import { StatPeriod } from '@prisma/client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = (url.searchParams.get('period') as StatPeriod) || 'WEEKLY';
  const items = await getTopNetProfit(period);
  return NextResponse.json({ items });
}