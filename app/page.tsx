'use client';
import { useState } from "react";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const path = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload: any = { email, password };
    if (!isLogin) payload.name = name;

    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(isLogin ? "登入成功，正在前往大廳…" : "註冊成功，請再登入");
      if (isLogin) window.location.href = "/lobby";
    } else {
      setMessage(data?.error || "發生錯誤");
    }
  };

  return (
    <div className="container">
      <h1>Fullstack Render Template</h1>
      <p className="note">Next.js + Prisma + JWT Cookie（Render-ready）</p>

      <div className="row" style={{justifyContent: 'space-between'}}>
        <button className="btn" onClick={() => setIsLogin(true)} disabled={isLogin}>登入</button>
        <button className="btn" onClick={() => setIsLogin(false)} disabled={!isLogin}>註冊</button>
      </div>

      <form onSubmit={submit}>
        {!isLogin && (
          <div>
            <label>暱稱（可選）</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label>密碼</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" required />
        </div>
        <button className="btn" type="submit">{isLogin ? "登入" : "註冊"}</button>
        {message && <div className="note">{message}</div>}
      </form>

      <hr />
      <div className="note">
        健康檢查：<code>/api/healthz</code>
      </div>
    </div>
  );
}
