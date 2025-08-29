// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  const hasToken = cookies().get("token")?.value;
  redirect(hasToken ? "/lobby" : "/auth");
}
