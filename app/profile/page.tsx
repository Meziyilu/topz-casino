'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type UserMe = {
  id: string;
  email: string;
  displayName: string | null;
  name: string | null;
  avatarUrl?: string | null;
  vipTier: number;
  balance: number;
  bankBalance: number;
  about?: string | null;
  country?: string | null;
  headframe?: string | null;
  panelStyle?: string | null;
  panelTint?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [tab, setTab] = useState<'overview' | 'edit' | 'appearance'>('overview');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    about: '',
    country: '',
    avatarUrl: '',
    headframe: '',
    panelStyle: 'glass',
    panelTint: 'neon',
  });

  useEffect(() => {
    fetch('/api/profile/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const u = d.user as UserMe;
        setUser(u);
        setForm({
          displayName: u.displayName ?? '',
          about: u.about ?? '',
          country: u.country ?? '',
          avatarUrl: u.avatarUrl ?? '',
          headframe: u.headframe ?? '',
          panelStyle: u.panelStyle ?? 'glass',
          panelTint: u.panelTint ?? 'neon',
        });
      })
      .catch(() => setUser(null));
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) setUser(data.user);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pf-wrap">
      <div className="pf-bg" />
      <header className="pf-header">
        <div className="pf-brand">TOPZCASINO</div>
        <nav className="pf-nav">
          <Link href="/" className="pf-link">大廳</Link>
          <Link href="/wallet" className="pf-link">錢包</Link>
          <Link href="/shop" className="pf-link">商店</Link>
        </nav>
      </header>

      <div className="pf-container">
        <aside className="pf-side">
          <div className="pf-card pf-usercard">
            <div className="pf-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="avatar" /> : <div className="pf-avatar-ph">🙂</div>}
              <div className="pf-frame" data-style={user?.headframe || 'none'} />
            </div>
            <div className="pf-userinfo">
              <div className="pf-name">{user?.displayName || '玩家'}</div>
              <div className="pf-meta">VIP {user?.vipTier ?? 0}</div>
              <div className="pf-meta tiny">上次登入：{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</div>
            </div>
          </div>

          <div className="pf-card">
            <div className="pf-kv"><span>錢包餘額</span><b>{user?.balance?.toLocaleString?.() ?? 0}</b></div>
            <div className="pf-kv"><span>銀行餘額</span><b>{user?.bankBalance?.toLocaleString?.() ?? 0}</b></div>
          </div>

          <div className="pf-card pf-tabs">
            <button className={tab==='overview'?'on':''} onClick={()=>setTab('overview')}>總覽</button>
            <button className={tab==='edit'?'on':''} onClick={()=>setTab('edit')}>編輯資料</button>
            <button className={tab==='appearance'?'on':''} onClick={()=>setTab('appearance')}>外觀樣式</button>
          </div>
        </aside>

        <section className="pf-main">
          {tab==='overview' && (
            <div className="pf-card">
              <div className="pf-title">個人簡介</div>
              <p className="pf-about">{user?.about || '—'}</p>
              <div className="pf-grid2">
                <div className="pf-kv"><span>Email</span><b>{user?.email}</b></div>
                <div className="pf-kv"><span>國家/地區</span><b>{user?.country || '—'}</b></div>
                <div className="pf-kv"><span>建立時間</span><b>{user? new Date(user.createdAt).toLocaleString() : '—'}</b></div>
              </div>
            </div>
          )}

          {tab==='edit' && (
            <div className="pf-card">
              <div className="pf-title">編輯基本資料</div>
              <div className="pf-form">
                <label className="pf-field">
                  <span>顯示名稱（2–20，中文/英數/底線）</span>
                  <input value={form.displayName} onChange={e=>setForm(f=>({...f, displayName:e.target.value}))} maxLength={20}/>
                </label>
                <label className="pf-field">
                  <span>自我介紹（最多 200）</span>
                  <textarea value={form.about} onChange={e=>setForm(f=>({...f, about:e.target.value}))} maxLength={200}/>
                </label>
                <label className="pf-field">
                  <span>國家/地區</span>
                  <input value={form.country} onChange={e=>setForm(f=>({...f, country:e.target.value}))} maxLength={32}/>
                </label>
                <label className="pf-field">
                  <span>頭像連結（暫用 URL）</span>
                  <input value={form.avatarUrl} onChange={e=>setForm(f=>({...f, avatarUrl:e.target.value}))} placeholder="https://..."/>
                </label>
                <div className="pf-actions">
                  <button className="pf-btn" onClick={onSave} disabled={saving}>{saving?'儲存中…':'儲存'}</button>
                </div>
              </div>
            </div>
          )}

          {tab==='appearance' && (
            <div className="pf-card">
              <div className="pf-title">外觀設定</div>
              <div className="pf-form">
                <label className="pf-field">
                  <span>頭像框（headframe）</span>
                  <select value={form.headframe} onChange={e=>setForm(f=>({...f, headframe:e.target.value}))}>
                    <option value="">無</option>
                    <option value="neon-cyan">Neon Cyan</option>
                    <option value="neon-violet">Neon Violet</option>
                    <option value="aurora">Aurora</option>
                  </select>
                </label>
                <label className="pf-field">
                  <span>面板風格（panelStyle）</span>
                  <select value={form.panelStyle} onChange={e=>setForm(f=>({...f, panelStyle:e.target.value}))}>
                    <option value="glass">Glass</option>
                    <option value="solid">Solid</option>
                    <option value="soft">Soft</option>
                  </select>
                </label>
                <label className="pf-field">
                  <span>面板色調（panelTint）</span>
                  <select value={form.panelTint} onChange={e=>setForm(f=>({...f, panelTint:e.target.value}))}>
                    <option value="neon">Neon</option>
                    <option value="blue">Blue</option>
                    <option value="violet">Violet</option>
                    <option value="amber">Amber</option>
                  </select>
                </label>
                <div className="pf-actions">
                  <button className="pf-btn" onClick={onSave} disabled={saving}>{saving?'儲存中…':'儲存'}</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 掛上專用 CSS */}
      <link rel="stylesheet" href="/styles/profile.css" />
    </main>
  );
}
