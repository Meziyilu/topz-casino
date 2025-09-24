'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DmThreadsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = async () => {
    if (done) return;
    const url = `/api/social/dm/threads${cursor ? `?cursor=${cursor}` : ''}`;
    const j = await fetch(url).then(r => r.json());
    setItems(prev => [...prev, ...(j.items || [])]);
    setCursor(j.nextCursor || null);
    if (!j.nextCursor) setDone(true);
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="container mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">私訊</h1>
      <div className="space-y-2">
        {items.map(t => (
          <Link key={t.id} href={`/social/dm/${t.id}`} className="block glass p-3 rounded-lg">
            <div className="font-semibold">{t.title || '對話'}</div>
            <div className="text-xs opacity-70">最後訊息：{t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString() : '-'}</div>
          </Link>
        ))}
      </div>
      {!done && <button className="btn" onClick={load}>載入更多</button>}
    </main>
  );
}
