'use client';
import { useEffect, useState } from 'react';
import UserCardMini from '@/components/social/UserCardMini';

export default function VisitorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = async () => {
    if (done) return;
    const url = `/api/social/profile/visitors${cursor ? `?cursor=${cursor}` : ''}`;
    const j = await fetch(url).then(r => r.json());
    setItems(prev => [...prev, ...(j.items || [])]);
    setCursor(j.nextCursor || null);
    if (!j.nextCursor) setDone(true);
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="container mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">最近訪客</h1>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((row) => (
          <div key={row.id} className="space-y-2">
            <UserCardMini user={row.viewer} />
            <div className="text-xs opacity-70">造訪時間：{new Date(row.visitedAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
      {!done && <button className="btn" onClick={load}>載入更多</button>}
    </main>
  );
}
