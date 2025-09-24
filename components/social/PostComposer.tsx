"use client";

import { useState } from "react";

export default function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body && !file) return;

    setLoading(true);
    let imageUrl: string | undefined;

    // 上傳圖片（簡化：直傳到 /api/social/upload-url）
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social/upload-url", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      imageUrl = data.url;
    }

    // 建立貼文
    await fetch("/api/social/feed/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, imageUrl }),
    });

    setBody("");
    setFile(null);
    setLoading(false);
    onPosted?.();
  }

  return (
    <form className="composer glass" onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="發表新貼文…"
      />
      <div className="actions">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "發送中…" : "發送"}
        </button>
      </div>
    </form>
  );
}
