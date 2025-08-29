// app/page.tsx
import { redirect } from "next/navigation";

// 先一律導去 /auth，確認有畫面再恢復登入判斷
export default function Home() {
  redirect("/auth");
}
