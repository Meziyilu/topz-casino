import { NextRequest } from 'next/server';

export async function parseFormData(req: NextRequest) {
  const fd = await req.formData();
  const map: Record<string, string> = {};
  fd.forEach((v, k) => (map[k] = String(v)));
  return map;
}
