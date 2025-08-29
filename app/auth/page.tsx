"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const toggleMode = () => setIsLogin(!isLogin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/lobby");
    } else {
      alert("失敗，請重試");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-blue-900">
      <div className="glass p-10 rounded-2xl shadow-xl w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "登入" : "註冊"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded bg-gray-800 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="密碼"
            className="p-3 rounded bg-gray-800 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn tilt w-full">
            {isLogin ? "登入" : "註冊"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          {isLogin ? "還沒有帳號？" : "已經有帳號？"}{" "}
          <button onClick={toggleMode} className="underline">
            {isLogin ? "註冊" : "登入"}
          </button>
        </p>
      </div>
    </div>
  );
}
