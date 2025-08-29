// app/auth/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import dynamic from "next/dynamic";

// 關閉 SSR，避免預渲染期觸發 useSearchParams 的限制
const AuthClient = dynamic(() => import("./AuthClient"), { ssr: false, loading: () => <div className="min-h-screen flex items-center justify-center text-white">載入中…</div> });

export default function Page() {
  return <AuthClient />;
}