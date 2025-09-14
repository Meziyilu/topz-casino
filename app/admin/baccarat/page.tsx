"use client";

import { useEffect, useState } from "react";

type ConfigMap = Record<string, number | string | boolean | null>;

export default function BaccaratAdminPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/casino/baccarat/admin/config");
      const data = await res.json();
      setConfig(data.config || {});
    })();
  }, []);

  const handleCfgChange = (key: string, value: string) => {
    let parsed: number | string | boolean | null = value;
    if (value === "true") parsed = true;
    else if (value === "false") parsed = false;
    else if (/^-?\d+$/.test(value)) parsed = parseInt(value, 10);
    else if (/^-?\d+\.\d+$/.test(value)) parsed = parseFloat(value);
    setConfig((prev) => ({ ...prev, [key]: parsed }));
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await fetch("/api/casino/baccarat/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      alert("✅ 設定已儲存");
    } catch (err) {
      console.error(err);
      alert("❌ 儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">百家樂管理面板</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">下注秒數</label>
          <input
            type="number"
            value={
              typeof config["BACCARAT:betSeconds"] === "number"
                ? config["BACCARAT:betSeconds"]
                : 30
            }
            onChange={(e) =>
              handleCfgChange("BACCARAT:betSeconds", e.target.value)
            }
            className="border rounded px-2 py-1 w-32"
          />
        </div>

        <div>
          <label className="block mb-1">開獎秒數</label>
          <input
            type="number"
            value={
              typeof config["BACCARAT:revealSeconds"] === "number"
                ? config["BACCARAT:revealSeconds"]
                : 8
            }
            onChange={(e) =>
              handleCfgChange("BACCARAT:revealSeconds", e.target.value)
            }
            className="border rounded px-2 py-1 w-32"
          />
        </div>

        {["R30", "R60", "R90"].map((room) => (
          <div key={room}>
            <label className="block mb-1">是否啟用 {room} 房</label>
            <select
              value={config[`BACCARAT:${room}:enabled`] === true ? "true" : "false"}
              onChange={(e) =>
                handleCfgChange(`BACCARAT:${room}:enabled`, e.target.value)
              }
              className="border rounded px-2 py-1 w-32"
            >
              <option value="true">啟用</option>
              <option value="false">停用</option>
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={saveConfig}
        disabled={loading}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "儲存中..." : "儲存設定"}
      </button>
    </div>
  );
}
