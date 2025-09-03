import { z } from 'zod';

export const zInt = z.number().int().nonnegative();
export const zCuid = z.string().regex(/^c[\w-]{24,}$/);

export function parseJson<T>(schema: z.ZodSchema<T>, body: unknown) {
  const res = schema.safeParse(body);
  if (!res.success) {
    throw new Error(res.error.issues.map(i => i.message).join(', '));
  }
  return res.data;
}