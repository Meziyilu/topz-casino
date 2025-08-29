// app/login/page.tsx（客戶端頁）
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/lobby";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.replace(next); // 登入後回到原本想去的頁面
    } else {
      alert("登入失敗");
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass p-6 rounded-xl">
      {/* 表單略 */}
    </form>
  );
}
