// app/page.tsx (Server Component)
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function Home() {
  const token = cookies().get("token")?.value;
  redirect(token ? "/lobby" : "/login");
}
