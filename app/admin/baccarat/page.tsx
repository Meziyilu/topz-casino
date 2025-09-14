"use client";

import { useEffect, useState } from "react";

type ConfigMap = Record<string, string | number | boolean>;

async function fetchConfig(): Promise<ConfigMap> {
  const res = await fetch("/api/casino/baccarat/admin/config");
  return res.json();
}

async function saveConfig(cfg: ConfigMap) {
  await fetch("/api/casino/baccarat/admin/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  });
}

export default function AdminBaccaratPage() {
  const [cfg, setCfg] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig().then((c) => {
      setCfg(c);
      setLoading(false);
    });
  }, []);

  function handleCfgChange(key: string, value: string | number) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    await saveConfig(cfg);
    alert("設定已儲存");
  }

  async function handleReset(room: "R30" | "R60" | "R90") {
    await fetch("/api/casino/baccarat/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room }),
    });
    alert(`${room} 已重置`);
  }

  if (loading) return <div>載入中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">百家樂管理</h1>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">基礎設定</h2>
        <div className="flex flex-col gap-2">
          <label>
            下注秒數：
            <input
              type="number"
              value={String(cfg["BACCARAT:betSeconds"] ?? 30)}
              onChange={(e) =>
                handleCfgChange("BACCARAT:betSeconds", Number(e.target.value))
              }
            />
          </label>
          <label>
            開獎秒數：
            <input
              type="number"
              value={String(cfg["BACCARAT:revealSeconds"] ?? 8)}
              onChange={(e) =>
                handleCfgChange("BACCARAT:revealSeconds", Number(e.target.value))
              }
            />
          </label>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">賠率設定</h2>
        <div className="grid grid-cols-2 gap-2">
          <RateInput
            label="莊"
            k="BACCARAT:rate:banker"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="0.95"
          />
          <RateInput
            label="閒"
            k="BACCARAT:rate:player"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="1"
          />
          <RateInput
            label="和"
            k="BACCARAT:rate:tie"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="8"
          />
          <RateInput
            label="莊對"
            k="BACCARAT:rate:bankerPair"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="11"
          />
          <RateInput
            label="閒對"
            k="BACCARAT:rate:playerPair"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="11"
          />
          <RateInput
            label="任意對子"
            k="BACCARAT:rate:anyPair"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="5"
          />
          <RateInput
            label="完美對子"
            k="BACCARAT:rate:perfectPair"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="25"
          />
          <RateInput
            label="超級六"
            k="BACCARAT:rate:superSix"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="0.5"
          />
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">房間控制</h2>
        <div className="flex gap-2">
          {(["R30", "R60", "R90"] as const).map((r) => (
            <button
              key={r}
              className="bg-red-500 text-white px-3 py-1 rounded"
              onClick={() => handleReset(r)}
            >
              重置 {r}
            </button>
          ))}
        </div>
      </div>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleSave}
      >
        儲存設定
      </button>
    </div>
  );
}

function RateInput({
  label,
  k,
  cfg,
  onChange,
  placeholder,
}: {
  label: string;
  k: string;
  cfg: ConfigMap;
  onChange: (key: string, value: string | number) => void;
  placeholder: string;
}) {
  return (
    <label>
      {label}：
      <input
        type="number"
        step="0.01"
        value={String(cfg[k] ?? "")}
        placeholder={placeholder}
        onChange={(e) => onChange(k, Number(e.target.value))}
      />
    </label>
  );
}
