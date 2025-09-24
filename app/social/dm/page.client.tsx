// app/social/dm/page.client.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Thread = {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  lastBody?: string | null;
  lastAt?: string | null;
  unread?: number;
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  type: 'USER' | 'SYSTEM';
};

export default function DmClient() {
  const sp = useSearchParams(); // ✅ OK：這裡是 client component
  const initialThreadId = sp.get('threadId') ?? '';

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>(initialThreadId);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');

  const listRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // threads
  const loadThreads = useCallback(async () => {
    try {
      const r = await fetch('/api/social/dm/threads', { cache: 'no-store' });
      if (!r.ok) throw new Error('bad');
      const d = await r.json();
      setThreads(d.items ?? []);
      // 若沒指定 threadId，自動選第一個
      if (!initialThreadId && d.items?.length) setActiveId(d.items[0].id);
    } catch {
      setThreads([]);
    }
  }, [initialThreadId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // messages：初次載入 + 切換 thread 時重置
  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) return;
    setLoadingMsgs(true);
    cursorRef.current = null;
    try {
      const r = await fetch(`/api/social/dm/${threadId}?limit=30`, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad');
      const d = await r.json();
      setMsgs(d.items ?? []);
      setHasMore(!!d.nextCursor);
      cursorRef.current = d.nextCursor ?? null;

      // 滾到最底
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch {
      setMsgs([]);
      setHasMore(false);
      cursorRef.current = null;
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  // 無限滾動（向上捲動載入更多）
  const onScroll = useCallback(async () => {
    const el = listRef.current;
    if (!el || loadingMore || !hasMore || !activeId) return;
    if (el.scrollTop > 40) return;

    setLoadingMore(true);
    try {
      const cursor = cursorRef.current ? `&cursor=${encodeURIComponent(cursorRef.current)}` : '';
      const r = await fetch(`/api/social/dm/${activeId}?limit=30${cursor}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad');
      const d = await r.json();

      const prevHeight = el.scrollHeight;
      setMsgs((old) => [...(d.items ?? []), ...old]);
      setHasMore(!!d.nextCursor);
      cursorRef.current = d.nextCursor ?? null;

      // 維持視窗位置（避免載入後跳動）
      requestAnimationFrame(() => {
        const newHeight = el.scrollHeight;
        el.scrollTop = newHeight - prevHeight;
      });
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [activeId, hasMore, loadingMore]);

  // 送出訊息
  const sendMsg = useCallback(async () => {
    if (!activeId || !body.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/social/chat/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: `DM:${activeId}`, body }),
      });
      if (!r.ok) throw new Error('bad');

      // 直接附加到尾端
      setMsgs((old) => [
        ...old,
        {
          id: `temp_${Date.now()}`,
          senderId: 'me',
          body: body.trim(),
          createdAt: new Date().toISOString(),
          type: 'USER',
        },
      ]);
      setBody('');
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch {
      // TODO: toast
    } finally {
      setSending(false);
    }
  }, [activeId, body, sending]);

  return (
    <div className="dm-wrap">
      {/* 左側：會話列表 */}
      <aside className="s-card padded" style={{ minHeight: 420 }}>
        <div className="s-card-title">私訊</div>
        <div className="s-list" style={{ maxHeight: 520, overflow: 'auto' }}>
          {threads.length === 0 && <div className="s-textarea">尚無會話</div>}
          {threads.map((t) => (
            <button
              key={t.id}
              className="s-list-item"
              onClick={() => setActiveId(t.id)}
              aria-pressed={activeId === t.id}
              style={activeId === t.id ? { borderColor: 'var(--s-primary)' } : undefined}
            >
              <img className="s-avatar" src={t.peerAvatar ?? '/avatar.png'} alt={t.peerName} />
              <div>
                <div style={{ fontWeight: 800 }}>{t.peerName}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{t.lastBody ?? '—'}</div>
              </div>
              {!!t.unread && (
                <span className="s-btn sm pill" style={{ pointerEvents: 'none' }}>
                  未讀 {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* 右側：訊息內容 */}
      <section className="s-card padded" style={{ minHeight: 420 }}>
        <div className="s-card-title">對話</div>

        <div
          ref={listRef}
          className="dm-msgs"
          onScroll={onScroll}
          style={{ marginTop: 8, padding: 8 }}
        >
          {loadingMsgs ? (
            <div className="s-center" style={{ height: 160 }}>載入中…</div>
          ) : msgs.length === 0 ? (
            <div className="s-center" style={{ height: 160 }}>尚無訊息</div>
          ) : (
            msgs.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: m.senderId === 'me' ? 'flex-end' : 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div
                  className="s-card padded"
                  style={{
                    maxWidth: '80%',
                    background:
                      m.type === 'SYSTEM'
                        ? 'rgba(255,255,255,.08)'
                        : m.senderId === 'me'
                        ? 'linear-gradient(180deg,var(--s-primary),var(--s-primary-2))'
                        : 'rgba(255,255,255,.06)',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
          {loadingMore && <div className="s-center" style={{ padding: 8 }}>載入更多…</div>}
        </div>

        {/* 送訊息列 */}
        <div className="dm-inputbar s-mt-12">
          <textarea
            className="s-textarea"
            placeholder="輸入訊息…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMsg();
              }
            }}
          />
          <button className="s-btn primary" onClick={sendMsg} disabled={!activeId || sending || !body.trim()}>
            發送
          </button>
        </div>
      </section>
    </div>
  );
}
