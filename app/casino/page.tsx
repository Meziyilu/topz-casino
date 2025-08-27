import Link from "next/link";

export const runtime = "nodejs";

export default function CasinoPage() {
  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">賭場</h1>
          <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
        </div>
        <p className="subtle">選擇房間（回合長度）：</p>

        <div className="grid">
          {([30,60,90] as const).map(sec => (
            <div key={sec} className="card col-4">
              <h3>百家樂 {sec}s 房</h3>
              <p className="note">每局 {sec} 秒，當日局號每日重置。</p>
              <Link href={`/casino/baccarat/${sec}`} className="btn shimmer">進入</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
