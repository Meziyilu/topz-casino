'use client';

import React from 'react';

export default function RegisterPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);

    const fd = new FormData(e.currentTarget);

    // ✅ 不用 entries()；改 forEach 序列化
    const raw: Record<string, string> = {};
    fd.forEach((value, key) => {
      raw[key] = typeof value === 'string' ? value : (value as File).name ?? '';
    });

    // checkbox 處理
    const payload = {
      email: raw.email?.trim(),
      password: raw.password,
      displayName: raw.displayName?.trim(),
      referralCode: raw.referralCode?.trim() || undefined,
      isOver18: (fd.get('isOver18') as string) === 'on',
      acceptTOS: (fd.get('acceptTOS') as string) === 'on',
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || `Register failed (${res.status})`);
      }

      setOk('註冊成功，請至信箱完成驗證後再登入。');
    } catch (err: any) {
      setError(err?.message || '註冊失敗，請稍後重試');
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
              className="w-full rounded-lg bg-white/5 text-white/90 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-400/40 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">暱稱（2–20字）</label>
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={20}
              className="w-full rounded-lg bg-white/5 text-white/90 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-400/40 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">密碼</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg bg-white/5 text-white/90 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-400/40 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">邀請碼（選填）</label>
            <input
              name="referralCode"
              className="w-full rounded-lg bg-white/5 text-white/70 placeholder-white/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-emerald-400/40 transition"
              placeholder="可留空"
            />
          </div>

          <div className="flex items-center gap-3 text-sm text-white/80">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input name="isOver18" type="checkbox" className="accent-emerald-400" required />
              我已滿 18 歲
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input name="acceptTOS" type="checkbox" className="accent-emerald-400" required />
              我同意服務條款
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {ok && <p className="text-sm text-emerald-400">{ok}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-3 py-2 bg-emerald-500/80 hover:bg-emerald-400/80 disabled:opacity-50 text-white transition shadow-lg shadow-emerald-900/30"
          >
            {loading ? '送出中…' : '建立帳號'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-white/70 hover:text-white">
            已有帳號？前往登入
          </a>
        </div>
      </div>
    </main>
  );
}
