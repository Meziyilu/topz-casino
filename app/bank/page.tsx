import Link from "next/link";

export const runtime = "nodejs";

export default function BankPage() {
  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">銀行</h1>
          <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
        </div>
        <p className="subtle">之後在這裡加上餘額、存款、提款、交易紀錄等功能。</p>

        <div className="grid">
          <div className="card col-6">
            <h3>餘額</h3>
            <div className="stat">—</div>
            <div className="note">連接 DB 之後在此顯示。</div>
          </div>
          <div className="card col-6">
            <h3>快速操作</h3>
            <div className="row">
              <button className="btn shimmer" disabled>存款</button>
              <button className="btn-secondary btn" disabled>提款</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
