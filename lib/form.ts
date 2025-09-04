// lib/form.ts
import { NextRequest } from 'next/server';

export async function parseFormData(req: NextRequest): Promise<Record<string, string>> {
  const fd = await req.formData();
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => (obj[k] = String(v)));
  return obj;
}
