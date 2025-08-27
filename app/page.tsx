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
      if (isLogin) window.location.href = "/lobby";
      else setMessage("註冊成功，請再登入");
    } else {
      setMessage(data?.error || "發生錯誤");
    }
  };

  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">TOPZCASINO</h1>
          <div className="row">
            <button className="btn-secondary btn" onClick={() => setIsLogin(true)} disabled={isLogin}>登入</button>
            <button className="btn shimmer" onClick={() => setIsLogin(false)} disabled={!isLogin}>註冊</button>
          </div>
        </div>

        <form className="form" onSubmit={submit}>
          {!isLogin && (
            <div>
              <label>暱稱（可選）</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label>密碼</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" required />
          </div>

          <div className="row space-between mt16">
            <span></span>
            <button className="btn shimmer" type="submit">{isLogin ? "登入" : "註冊"}</button>
          </div>

          {message && <div className="note mt16">{message}</div>}
        </form>
      </div>
    </div>
  );
}
