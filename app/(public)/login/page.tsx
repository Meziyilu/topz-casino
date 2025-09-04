"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./auth-theme.css";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.ok) {
      setError("登入失敗，請檢查帳號或密碼");
      return;
    }

    // ✅ 成功登入 → 導向大廳 (/)
    router.push("/");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2 className="auth-title">登入</h2>

        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="密碼" required />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  );
}
