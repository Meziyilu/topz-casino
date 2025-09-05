// app/(public)/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PublicPage() {
  // 直接導向大廳
  redirect("/lobby");
}
