'use client';

import { useRef, useState } from 'react';

export default function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [body, setBody] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const r = await fetch(`/api/media/upload-url?ext=${encodeURIComponent(ext)}`);
      const d = await r.json();
      if (!r.ok || !d.url || !d.cdnUrl) throw new Error('sign fail');
      await fetch(d.url, { method: 'PUT', body: file, headers: { 'content-type': file.type } });
      setImgUrl(d.cdnUrl);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const payload: any = { body };
    if (imgUrl) payload.imageUrl = imgUrl;

    const r = await fetch('/api/social/feed/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      setBody('');
      setImgUrl(null);
      onPosted?.();
    }
  }

  return (
    <div className="s-card s-col s-gap-10">
      <textarea
        className="s-textarea"
        placeholder="想說點什麼？"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {imgUrl && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} className="post-media" alt="" />
        </div>
      )}
      <div className="s-flex s-gap-10">
        <button
          type="button"
          className="s-btn ghost"
          onClick={() => fileRef.current?.click()}
          data-sound
        >
          上傳圖片
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
        />
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="s-btn primary"
          onClick={submit}
          disabled={uploading || (!body.trim() && !imgUrl)}
          data-sound
        >
          發佈
        </button>
      </div>
    </div>
  );
}
