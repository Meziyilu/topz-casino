// lib/http.ts
import { NextRequest } from 'next/server';

/** 統一解析 body：同時支援 JSON 與 form-data（避免 TS Iterator 型別問題） */
export async function parseBody(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  if (isJson) return await req.json();

  const fd = await req.formData();
  const entries: [string, string][] = [];
  fd.forEach((v, k) => {
    if (typeof v === 'string') entries.push([k, v]);
    // 如需處理 File，可在此擴充
  });
  return Object.fromEntries(entries);
}
