"use client";

import { useEffect, useState } from "react";

type Marquee = {
  id: string;
  text: string;
  enabled: boolean;
  priority: number;
};

export default function MarqueePage() {
  const [list, setList] = useState<Marquee[]>([]);
  const [text, setText] = useState("");

  async function fetchList() {
    const res = await fetch("/api/admin/marquee");
    const data = await res.json();
    setList(data.items || []);
  }

  async function addMarquee() {
    await fetch("/api/admin/marquee", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    setText("");
    fetchList();
  }

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">跑馬燈管理</h1>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border p-2 flex-1"
          placeholder="輸入跑馬燈文字"
        />
        <button onClick={addMarquee} className="bg-blue-500 text-white px-4 py-2 rounded">
          新增
        </button>
      </div>

      <ul className="space-y-2">
        {list.map((m) => (
          <li key={m.id} className="border p-2 rounded bg-white">
            <div>{m.text}</div>
            <div className="text-xs text-gray-500">
              {m.enabled ? "啟用" : "停用"} | 優先度 {m.priority}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
