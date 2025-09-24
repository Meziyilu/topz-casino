'use client';
import { useEffect, useRef, useState } from 'react';

export default function DmWindowPage({ params }: { params: { threadId: string } }) {
  const { threadId } = params;
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [text, setText] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const load = async (initial = false) => {
    if (!initial && done) return;
    const url = `/api/social/dm/messages?threadId=${threadId}${cursor ? `&cursor=${cursor}` : ''}`;
    const j = await fetch(url).then(r => r.json());
    if (initial) setItems(j.items || []);
    else setItems(prev => [...(j.items || []), ...prev]);
    setCursor(j.nextCursor || null);
    if (!j.nextCursor) setDone(true);
  };

  useEffect(() => { load(true); }, [threadId]);

  useEffect(() => {
    // 滾到底
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [items]);

  const send = async () => {
    if (!text.trim()) return;
    const res = await fetch('/api/social/dm/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, body: text }),
    });
    const j = await res.json();
    if (j.ok) {
      setItems(prev => [...prev, j.message]);
      setText('');
    }
  };

  return (
    <main className="container mx-auto p-4 space-y-3">
      <header className="glass p-3 rounded-lg flex items-center justify-between">
        <h1 className="font-bold">私訊</h1>
        {!done && <button className="btn" onClick={() => load(false)}>載入更舊</button>}
      </header>

      <div ref={boxRef} className="glass p-3 rounded-lg h-[60vh] overflow-y-auto space-y-2">
        {items.map((m) => (
          <div key={m.id} className="p-2 rounded bg-black/20">
            <div className="text-xs opacity-70">{new Date(m.createdAt).toLocaleString()}</div>
            <div>{m.body}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="input flex-1" value={text} onChange={e => setText(e.target.value)} placeholder="輸入訊息..." />
        <button className="btn" onClick={send}>送出</button>
      </div>
    </main>
  );
}
