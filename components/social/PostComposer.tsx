'use client';

import { useState } from 'react';

type Props = {
  onPosted?: () => void;
};

export default function PostComposer({ onPosted }: Props) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;

    // 先試 S3/R2 預簽（若後端有提供）
    try {
      const presign = await fetch('/api/media/upload-url?ext=' + encodeURIComponent(file.name.split('.').pop() || 'jpg'));
      if (presign.ok) {
        const { uploadUrl, cdnUrl, headers } = await presign.json();
        const put = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: headers || { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (put.ok) return cdnUrl;
      }
    } catch {}

    // fallback：走本地暫存上傳
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/media/upload', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('upload failed');
    const d = await r.json();
    return d.url as string;
  };

  const onSubmit = async () => {
    setErr(null);
    if (!body.trim() && !file) {
      setErr('請輸入內容或選擇一張圖片');
      return;
    }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadFile();

      const r = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, imageUrl }),
      });
      if (!r.ok) throw new Error('post failed');
      setBody('');
      setFile(null);
      setPreview(null);
      onPosted?.();
    } catch (e: any) {
      setErr(e?.message || '發文失敗');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="s-card padded s-col s-gap-10" data-sound>
      <div className="s-card-title">發表貼文</div>
      <textarea
        className="s-textarea"
        placeholder="分享點什麼…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="s-flex s-gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="s-btn ghost sm pill" data-sound>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
          上傳圖片
        </label>
        {file && <span style={{ fontSize: 12, opacity: 0.8 }}>{file.name}</span>}
        <div style={{ marginLeft: 'auto' }} />
        <button className="s-btn primary pill" onClick={onSubmit} disabled={posting} data-sound>
          {posting ? '發送中…' : '發佈'}
        </button>
      </div>
      {preview && <img src={preview} alt="" className="post-media" />}
      {err && <div className="s-card-subtitle" style={{ color: '#ff8a8a' }}>{err}</div>}
    </div>
  );
}
