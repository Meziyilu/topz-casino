// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Home() {
  const token = cookies().get("token")?.value;
  redirect(token ? "/lobby" : "/auth");
}
