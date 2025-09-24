'use client';
import { useEffect, useState } from 'react';
import UserCardMini from '@/components/social/UserCardMini';

export default function DiscoverPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [suggest, setSuggest] = useState<any[]>([]);

  const doSearch = async () => {
    if (!q.trim()) { setItems([]); return; }
    const res = await fetch(`/api/social/users/search?q=${encodeURIComponent(q.trim())}`);
    const j = await res.json();
    setItems(j.items || []);
  };

  useEffect(() => {
    fetch('/api/social/users/suggest?limit=10').then(r => r.json()).then(j => setSuggest(j.items || []));
  }, []);

  return (
    <main className="container mx-auto p-4 space-y-6">
      <header className="glass p-4 rounded-xl">
        <h1 className="text-xl font-bold">探索玩家</h1>
        <div className="mt-3 flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="輸入名稱 / Slug"
            className="input flex-1" />
          <button onClick={doSearch} className="btn">搜尋</button>
        </div>
      </header>

      {q.trim() && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">搜尋結果</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((u) => <UserCardMini key={u.id} user={u} />)}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">為你推薦</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {suggest.map((u) => <UserCardMini key={u.id} user={u} />)}
        </div>
      </section>
    </main>
  );
}
