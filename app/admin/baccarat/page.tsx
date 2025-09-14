"use client";

import { useEffect, useState } from "react";

type ConfigValue = number | string | boolean | null;
type ConfigMap = Record<string, ConfigValue>;

export default function BaccaratAdminPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadConfig() {
    try {
      setBusy(true);
      setErr(null);
      const res = await fetch("/api/casino/baccarat/admin/config", { cache: "no-store" });
      const data = await res.json();
      setConfig(data.config || {});
    } catch (e: any) {
      console.error(e);
      setErr("讀取設定失敗");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  // 將 UI 字串轉回正確型別
  function parseValue(value: string): ConfigValue {
    if (value === "null") return null;
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  // 統一處理設定變更
  const handleCfgChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: parseValue(value) }));
  };

  // 顯示用：把任何值變成字串（避免把 boolean 直接塞到 input 造成報錯）
  const show = (v: ConfigValue, fallback: string) => {
    if (v === undefined || v === null) return fallback;
    return String(v);
  };

  const saveConfig = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/casino/baccarat/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 後端會根據型別分別寫 valueInt / valueFloat / valueBool / valueString
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "儲存失敗");
      }
      alert("✅ 設定已儲存");
      // 重新讀取避免快取或型別差異
      await loadConfig();
    } catch (err: any) {
      console.error(err);
      alert("❌ 儲存失敗");
      setErr(err?.message ?? "儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-bold mb-4">百家樂管理面板</h1>

      {err && (
        <div className="mb-4 rounded bg-red-900/40 border border-red-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="space-y-6 max-w-xl">
        {/* 下注秒數 */}
        <div>
          <label className="block mb-1">下注秒數（BACCARAT:betSeconds）</label>
          <input
            type="number"
            inputMode="numeric"
            className="border border-slate-600 bg-slate-800 rounded px-2 py-1 w-40"
            value={show(config["BACCARAT:betSeconds"], "30")}
            onChange={(e) => handleCfgChange("BACCARAT:betSeconds", e.target.value)}
          />
        </div>

        {/* 開獎秒數 */}
        <div>
          <label className="block mb-1">開獎秒數（BACCARAT:revealSeconds）</label>
          <input
            type="number"
            inputMode="numeric"
            className="border border-slate-600 bg-slate-800 rounded px-2 py-1 w-40"
            value={show(config["BACCARAT:revealSeconds"], "8")}
            onChange={(e) => handleCfgChange("BACCARAT:revealSeconds", e.target.value)}
          />
        </div>

        {/* 房間開關 */}
        {(["R30", "R60", "R90"] as const).map((room) => {
          const key = `BACCARAT:${room}:enabled`;
          const val = config[key];
          const selectValue = val === true ? "true" : "false";
          return (
            <div key={room}>
              <label className="block mb-1">是否啟用 {room} 房（{key}）</label>
              <select
                className="border border-slate-600 bg-slate-800 rounded px-2 py-1 w-40"
                value={selectValue}
                onChange={(e) => handleCfgChange(key, e.target.value)}
              >
                <option value="true">啟用</option>
                <option value="false">停用</option>
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={saveConfig}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded"
        >
          {loading ? "儲存中..." : "儲存設定"}
        </button>

        <button
          onClick={loadConfig}
          disabled={busy}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 rounded"
        >
          重新載入
        </button>
      </div>
    </div>
  );
}
