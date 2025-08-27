import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const runtime = "nodejs";

export default async function LobbyPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) {
    return (
      <div className="container">
        <h1>未登入</h1>
        <p className="note">請先 <Link href="/">回首頁登入</Link></p>
      </div>
    );
  }

  try {
    const payload = await verifyJWT(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    if (!user) throw new Error("no user");
    return (
      <div className="container">
        <h1>大廳</h1>
        <p>歡迎，<b>{user.name || user.email}</b></p>
        <p className="note">你可以在這裡擴充面板、銀行、抽卡、百家樂…</p>
        <form method="POST" action="/api/auth/login?signout=1">
          <button className="btn" type="submit">登出</button>
        </form>
      </div>
    );
  } catch {
    return (
      <div className="container">
        <h1>登入失敗或逾期</h1>
        <p className="note"><Link href="/">回首頁重新登入</Link></p>
      </div>
    );
  }
}
