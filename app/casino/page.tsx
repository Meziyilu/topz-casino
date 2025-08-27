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
        <p className="subtle">選擇你要進入的桌遊。先提供百家樂，之後可擴充骰寶、輪盤等。</p>

        <div className="grid">
          <div className="card col-6">
            <h3>百家樂 Baccarat</h3>
            <p className="note">進入百家樂賭桌（可擴充每分鐘自動開局、下注面板、派彩等）。</p>
            <Link href="/casino/baccarat" className="btn shimmer">前往賭桌</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
