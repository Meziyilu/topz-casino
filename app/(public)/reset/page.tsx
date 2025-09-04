// app/(public)/reset/page.tsx
import "../auth-theme.css";
import ResetForm from "./reset-form";

export default function ResetPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const tokenInUrl = searchParams?.token ?? "";
  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* 置中文字 LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
        <div className="tc-tabs">
          <a href="/login" className="tc-tab">登入</a>
          <a href="/register" className="tc-tab">註冊</a>
          <span className="tc-tab active" aria-current="page">重設密碼</span>
        </div>

        {/* 將 URL token 傳給 client 元件，不用在 client 再讀 searchParams */}
        <ResetForm initialToken={tokenInUrl} />
      </div>
    </main>
  );
}
