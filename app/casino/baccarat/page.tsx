import Link from "next/link";

export const runtime = "nodejs";

export default function BaccaratPage() {
  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">百家樂賭桌</h1>
          <div className="row">
            <Link href="/casino" className="btn-secondary btn">返回賭場</Link>
            <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
          </div>
        </div>

        <p className="subtle">這是賭桌骨架頁面。接下來可加入：局號、倒數計時、下注區、開牌動畫、派彩結算、近10局路單等。</p>

        <div className="grid">
          <div className="card col-12">
            <h3>下注區（預留）</h3>
            <div className="note">之後可放「閒 / 莊 / 和 / 閒對 / 莊對 / 任意對 / 完美對」等下注按鈕。</div>
          </div>
          <div className="card col-6">
            <h3>局狀態</h3>
            <div className="note">顯示回合、牌面、總點數、結果。</div>
          </div>
          <div className="card col-6">
            <h3>近10局（路單）</h3>
            <div className="note">留給統計圖或圓點路單。</div>
          </div>
        </div>
      </div>
    </div>
  );
}
