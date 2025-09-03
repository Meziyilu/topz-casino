// lib/form.ts
export async function parseFormData(req: Request): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const fd = await req.formData();
  // 用 forEach 避免 TS 對 FormData.entries 的 Iterator 型別問題
  fd.forEach((value, key) => {
    map[key] = String(value);
  });
  return map;
}
