// app/(public)/register/page.tsx
export const metadata = { title: '註冊 | Topzcasino' };

export default function RegisterPage() {
  return (
    <section className="glass-card">
      <div className="head">
        <h1 className="title">建立你的帳號</h1>
        <p className="sub">2–20 字暱稱、Email 驗證後即可遊玩</p>
      </div>
      <div className="body">
        <form action="/api/auth/register" method="POST" noValidate>
          <div className="auth-field">
            <label htmlFor="displayName" className="auth-label">玩家暱稱</label>
            <input id="displayName" name="displayName" type="text" required minLength={2} maxLength={20}
                   placeholder="玩家_001" className="auth-input" />
            <p className="auth-help">可用中文/英文/數字/底線</p>
          </div>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" className="auth-input" />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">密碼</label>
            <input id="password" name="password" type="password" required minLength={8} className="auth-input" />
            <p className="auth-help">至少 8 碼，建議混合大小寫與符號</p>
          </div>

          <div className="auth-field">
            <label htmlFor="referralCode" className="auth-label">邀請碼（選填）</label>
            <input id="referralCode" name="referralCode" type="text" placeholder="ABCDEFGH" className="auth-input" />
          </div>

          <div className="auth-field" style={{ alignItems: 'start' }}>
            <label className="auth-label" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" name="acceptTOS" required />
              我已閱讀並同意服務條款
            </label>
          </div>

          <button className="auth-btn shimmer" type="submit">建立帳號</button>

          <div className="hr" />

          <div className="alt-row">
            <span className="auth-help">已經有帳號？</span>
            <a className="link-muted" href="/login">前往登入</a>
          </div>
        </form>
      </div>
    </section>
  );
}
