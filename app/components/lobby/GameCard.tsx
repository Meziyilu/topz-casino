import Link from "next/link";

export default function GameCard({
  title, online, countdown, href, disabled,
}: { title: string; online?: number; countdown?: number; href: string; disabled?: boolean; }) {
  return (
    <Link href={href} className={`game-card ${disabled ? "disabled" : ""}`}>
      <div className="title">{title}</div>
      <div className="meta">
        {typeof online === "number" && <span>在線 {online}人</span>}
        {typeof countdown === "number" && <span style={{marginLeft:10}}>倒數 {countdown}s</span>}
      </div>
      {!disabled && <div className="badge">立即進入</div>}
      {disabled && <div className="badge">COMING SOON</div>}
    </Link>
  );
}
