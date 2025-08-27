import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const runtime = "nodejs";

export default async function LobbyPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) {
    return (
      <div className="glass">
        <div className="content">
          <h1 className="h1">未登入</h1>
          <p className="subtle">請先 <Link href="/">回首頁登入</Link></p>
        </div>
      </div>
    );
  }

  try {
    const payload = await verifyJWT(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    if (!user) throw new Error("no user");

    return (
      <div className="glass">
        <div className="content">
          <div className="row space-between">
            <h1 className="h1">大廳</h1>
            <form method="POST" action="/api/auth/login?signout=1">
              <button className="btn-secondary btn" type="submit">登出</button>
            </form>
          </div>
          <p className="subtle">歡迎，<b>{user.name || user.email}</b> — 這裡之後可以放銀行、抽卡、百家樂的入口。</p>

          <div className="grid">
            <div className="card col-6">
              <h3>我的資訊</h3>
              <div className="row" style={{justifyContent:'space-between'}}>
                <div>
                  <div className="subtle">Email</div>
                  <div>{user.email}</div>
                </div>
                <div>
                  <div className="subtle">建立時間</div>
                  <div>{new Date(user.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="card col-6">
              <h3>快速動作</h3>
              <div className="row">
                <button className="btn">前往銀行</button>
                <button className="btn-secondary btn">抽卡</button>
                <button className="btn-secondary btn">百家樂</button>
              </div>
            </div>

            <div className="card col-4">
              <h3>系統狀態</h3>
              <div className="stat">OK</div>
              <div className="note">健康檢查 /api/healthz</div>
            </div>

            <div className="card col-4">
              <h3>版本</h3>
              <div className="stat">全端 1.0（玻璃面板）</div>
              <div className="note">Next.js + Prisma + JWT</div>
            </div>

            <div className="card col-4">
              <h3>接下來</h3>
              <div className="note">可加：餘額/存提款、抽卡動畫、賭桌面板…</div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="glass">
        <div className="content">
          <h1 className="h1">登入失敗或逾期</h1>
          <p className="subtle"><Link href="/">回首頁重新登入</Link></p>
        </div>
      </div>
    );
  }
}
