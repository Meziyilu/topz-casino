"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
};

export default function AnnouncementPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function fetchList() {
    const res = await fetch("/api/admin/announcement");
    const data = await res.json();
    setList(data.items || []);
  }

  async function addAnnouncement() {
    await fetch("/api/admin/announcement", {
      method: "POST",
      body: JSON.stringify({ title, body }),
    });
    setTitle("");
    setBody("");
    fetchList();
  }

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">公告欄管理</h1>

      <div className="flex flex-col gap-2 border p-4 rounded bg-gray-50">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2"
          placeholder="公告標題"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="border p-2"
          placeholder="公告內容"
        />
        <button onClick={addAnnouncement} className="bg-blue-500 text-white px-4 py-2 rounded">
          新增公告
        </button>
      </div>

      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id} className="border p-2 rounded bg-white">
            <div className="font-bold">{a.title}</div>
            <div>{a.body}</div>
            <div className="text-xs text-gray-500">
              {a.enabled ? "啟用" : "停用"}
              {a.startAt && ` | 開始: ${new Date(a.startAt).toLocaleString()}`}
              {a.endAt && ` | 結束: ${new Date(a.endAt).toLocaleString()}`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
