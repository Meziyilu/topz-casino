// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const token = cookies().get("token")?.value;
  redirect(token ? "/lobby" : "/login");
}
