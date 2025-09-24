// app/social/dm/[threadId]/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // ✅ 不要用 object

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import '@/public/styles/social.css';

type Message = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

export default function DMThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // 模擬載入訊息
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/social/dm/${threadId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages ?? []);
        }
      } catch (err) {
        console.error('載入訊息失敗', err);
      }
    })();
  }, [threadId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      const res = await fetch(`/api/social/dm/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: input }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput('');
      }
    } catch (err) {
      console.error('發送失敗', err);
    }
  };

  return (
    <main className="social-wrap">
      <header className="social-header">
        <h1 className="s-card-title">會話 #{threadId}</h1>
      </header>

      {/* 訊息區 */}
      <div className="dm-msgs s-col s-gap-8">
        {messages.map((m) => (
          <div key={m.id} className="s-card padded">
            <div className="s-card-title">{m.sender}</div>
            <div className="post-body">{m.body}</div>
            <div className="s-card-subtitle">{m.createdAt}</div>
          </div>
        ))}
      </div>

      {/* 輸入區 */}
      <div className="dm-inputbar s-mt-12">
        <input
          className="s-input"
          placeholder="輸入訊息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="s-btn primary" onClick={handleSend}>
          發送
        </button>
      </div>
    </main>
  );
}
