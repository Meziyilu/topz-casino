// app/auth/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import NextDynamic from "next/dynamic";

const AuthClient = NextDynamic(() => import("./AuthClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-white">
      載入中…
    </div>
  ),
});

export default function Page() {
  return <AuthClient />;
}
