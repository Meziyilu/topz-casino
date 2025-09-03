// lib/form.ts
export async function parseFormData(req: Request): Promise<Record<string, string>> {
  const fd = await req.formData();
  const map: Record<string, string> = {};
  fd.forEach((value, key) => {
    map[key] = String(value);
  });
  return map;
}
