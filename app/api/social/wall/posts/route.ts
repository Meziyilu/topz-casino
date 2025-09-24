export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const PostSchema = z.object({
  body: z.string().min(1).max(1000),
  imageUrl: z.string().url().optional(),
  medias: z.array(z.object({ url: z.string().url(), kind: z.string().default('image'), meta: z.any().optional() })).optional(),
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const payload = await req.json();
  const data = PostSchema.parse(payload);

  const post = await prisma.wallPost.create({
    data: {
      userId: me.id,
      body: data.body.trim(),
      imageUrl: data.imageUrl,
      medias: {
        create: (data.medias ?? []).map(m => ({ url: m.url, kind: m.kind, meta: m.meta })),
      },
    },
    include: { medias: true },
  });

  return NextResponse.json({ ok: true, post });
}
