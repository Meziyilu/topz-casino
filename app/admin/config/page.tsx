"use client";
import React, { useEffect, useState } from "react";

type KV = { key: string; value: string };

export default function AdminConfigPage() {
  const [list, setList] = useState<KV[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // 這裡先用假資料避免 API 依賴阻塞 build
      setList([
        { key: "BACCARAT:ROUND_SECONDS", value: "30" },
        { key: "LOTTO:DRAW_INTERVAL_SEC", value: "20" }
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">系統設定（GameConfig）</h1>

      <section className="rounded-lg border p-4 space-y-3">
        {loading ? (
          <div>載入中</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2">Key</th>
                <th className="py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.key} className="border-t">
                  <td className="py-2">{it.key}</td>
                  <td className="py-2">
                    <input className="border rounded px-2 py-1" defaultValue={it.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
