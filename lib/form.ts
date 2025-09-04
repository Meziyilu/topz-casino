// lib/form.ts
export async function parseFormData(req: Request) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  if (isJson) return await req.json();

  const fd = await req.formData();
  const map: Record<string, string> = {};
  fd.forEach((v, k) => { map[k] = String(v); });
  return map;
}
