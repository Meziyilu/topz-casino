// app/auth/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import dynamicImport from "next/dynamic";

const AuthClient = dynamicImport(() => import("./AuthClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen grid place-items-center text-white">
      載入中…
    </div>
  ),
});

export default function AuthPage() {
  return <AuthClient />;
}
