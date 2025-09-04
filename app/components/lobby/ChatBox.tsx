"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; user: string; body: string; ts: number; };

export default function ChatBox({ room }: { room: string }) {
  const [list, setList] = useState<Msg[]>([
    { id: "1", user: "SYSTEM", body: `歡迎來到 ${room}`, ts: Date.now() }
  ]);
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(()=> {
    // 自動捲到底
    if (!box.current) return;
    box.current.scrollTop = box.current.scrollHeight;
  }, [list.length]);

  async function send() {
    if (!text.trim()) return;
    const m: Msg = { id: crypto.randomUUID(), user: "你", body: text.trim(), ts: Date.now() };
    setList(l => [...l, m]);
    setText("");

    // TODO: 之後串 /api/chat/send
    // await fetch('/api/chat/send', { method:'POST', body: JSON.stringify({ room, body: m.body }) })
  }

  return (
    <div className="lb-card chat-box">
      <div className="chat-head">
        <div className="lb-card-title">大廳聊天室</div>
        <div className="lb-muted" style={{fontSize:12}}>房間：{room}</div>
      </div>
      <div ref={box} className="chat-body">
        {list.map(m =>
          <div key={m.id} className="chat-item"><b>{m.user}：</b>{m.body}</div>
        )}
      </div>
      <div className="chat-foot">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="輸入訊息…" />
        <button onClick={send}>送出</button>
      </div>
    </div>
  );
}
