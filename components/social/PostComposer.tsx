// components/social/PostComposer.tsx
"use client";

import { useMemo, useState } from "react";

type Props = {
  onPosted?: () => void;
  me?: { avatarUrl?: string | null };
};

export default function PostComposer({ onPosted, me }: Props) {
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const canSubmit = body.trim().length > 0 || imageUrl.trim().length > 0;

  const previewList = useMemo(() => {
    const arr = imageUrl
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3); // 最多 3 張預覽
    return arr;
  }, [imageUrl]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    await fetch("/api/social/feed/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, imageUrl }),
    }).catch(() => {});

    setBody("");
    setImageUrl("");
    onPosted?.();
  }

  return (
    <form className="post-composer" onSubmit={submit}>
      <div className="pc-row">
        <img className="pc-avatar" src={me?.avatarUrl ?? "/img/avatar-default.png"} alt="" />
        <div className="pc-inputs">
          <textarea
            className="pc-textarea"
            placeholder="分享一下你現在的想法…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <input
            className="pc-url"
            placeholder="圖片網址（多張用空白或逗號分隔，可跳過）"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          {previewList.length > 0 && (
            <div className="pc-preview">
              {previewList.map((url) => (
                <div className="pc-thumb" key={url}>
                  <img src={url} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pc-actions">
        <div className="pc-left">
          <button type="button" className="pc-tool" data-sound>
            📷 相簿
          </button>
          <button type="button" className="pc-tool" data-sound>
            🌐 公開
          </button>
        </div>
        <div className="pc-right">
          <button type="submit" className="pc-submit" disabled={!canSubmit} data-sound>
            發佈
          </button>
        </div>
      </div>
    </form>
  );
}
