// app/social/dm/[threadId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import '@/public/styles/social.css';

export default function DMPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [msgs, setMsgs] = useState<any[]>([]);

  useEffect(() => {
    if (!threadId) return;
    fetch(`/api/social/dm/thread?threadId=${threadId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setMsgs(d.items || []))
      .catch(() => setMsgs([]));
  }, [threadId]);

  return (
    <main className="dm-wrap">
      <div className="s-card padded">
        <h1 className="s-card-title">私訊 Thread {threadId}</h1>
        <div className="dm-msgs">
          {msgs.map(m => (
            <div key={m.id} className="s-list-item">
              <img src={m.from.avatarUrl || '/avatar-default.png'} className="s-avatar" alt="" />
              <div>
                <div><b>{m.from.displayName}</b></div>
                <div>{m.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
