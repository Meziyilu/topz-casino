// app/auth/AuthClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthClient() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, ...(mode === "register" ? { name } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data?.error || "失敗");
    router.push("/lobby");
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="glass glow-ring p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1 text-center">TOPZCASINO</h1>
        <p className="text-center text-white/70 mb-6">
          {mode === "login" ? "登入你的帳號" : "建立新帳號"}
        </p>

        <div className="mb-4 flex gap-2">
          <button
            className={`btn flex-1 ${mode === "login" ? "opacity-100" : "opacity-60"}`}
            onClick={() => setMode("login")}
          >
            登入
          </button>
          <button
            className={`btn flex-1 ${mode === "register" ? "opacity-100" : "opacity-60"}`}
            onClick={() => setMode("register")}
          >
            註冊
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              className="w-full px-3 py-2 rounded bg-white/10 outline-none"
              placeholder="暱稱（可留空）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="w-full px-3 py-2 rounded bg-white/10 outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <input
            className="w-full px-3 py-2 rounded bg-white/10 outline-none"
            placeholder="密碼"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {msg && <div className="text-red-300 text-sm">{msg}</div>}
          <button className="btn w-full mt-1" type="submit">
            {mode === "login" ? "登入" : "註冊"}
          </button>
        </form>
      </div>
    </div>
  );
}
