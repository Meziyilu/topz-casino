'use client';

import React from 'react';

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    // ✅ 不用 entries()；改用 forEach 序列化，避免 TS DOM lib 版本差異
    const body: Record<string, string> = {};
    fd.forEach((value, key) => {
      body[key] = typeof value === 'string' ? value : (value as File).name ?? '';
    });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Login failed (${res.status})`);
      }

      // 登入成功導回大廳
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || '登入失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* 背景動畫（深色玻璃霧面） */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0b0f15] via-[#0c1220] to-[#0b0f15]" />
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-24 -left-24 w-[34rem] h-[34rem] rounded-full blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(40% 40% at 50% 50%, #5b5bd6, transparent)' }} />
        <div className="absolute -bottom-24 -right-24 w-[34rem] h-[34rem] rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]"
             style={{ background: 'radial-gradient(40% 40% at 50% 50%, #0ea5e9, transparent)' }} />
      </div>

      <div
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{
          background: 'rgba(20,24,32,0.55)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow:
            '0 8px 35px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.03)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <h1 className="text-center text-lg tracking-[0.2em] text-white/90 mb-6">
          TOPZCASINO
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg bg-white/5 text-white/90 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-cyan-400/40 transition"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">密碼</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-white/5 text-white/90 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-cyan-400/40 transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-3 py-2 bg-cyan-500/80 hover:bg-cyan-400/80 disabled:opacity-50 text-white transition shadow-lg shadow-cyan-900/30"
          >
            {loading ? '登入中…' : '登入'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/register" className="text-sm text-white/70 hover:text-white">
            沒有帳號？前往註冊
          </a>
        </div>
      </div>
    </main>
  );
}
