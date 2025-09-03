// app/(public)/login/page.tsx
export const metadata = { title: '登入 | Topzcasino' };

export default function LoginPage() {
  return (
    <section className="glass-card">
      <div className="head">
        <h1 className="title">歡迎回來</h1>
        <p className="sub">請使用您的帳號登入</p>
      </div>
      <div className="body">
        <form action="/api/auth/login" method="POST" noValidate>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" className="auth-input" />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">密碼</label>
            <input id="password" name="password" type="password" required minLength={8} className="auth-input" />
            <div className="alt-row">
              <a className="link-muted" href="/forgot">忘記密碼？</a>
            </div>
          </div>

          <button className="auth-btn shimmer" type="submit">登入</button>

          <div className="hr" />

          <div className="alt-row">
            <span className="auth-help">還沒有帳號？</span>
            <a className="link-muted" href="/register">前往註冊</a>
          </div>
        </form>
      </div>
    </section>
  );
}
