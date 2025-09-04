export default function ProfileCard({
  displayName, avatarUrl, vipTier, wallet, bank,
}: { displayName: string; avatarUrl?: string; vipTier: number; wallet: number; bank: number; }) {
  return (
    <div className="lb-card">
      <div className="lb-card-title">玩家資訊</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, overflow: "hidden",
          border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.08)",
          display: "grid", placeItems: "center"
        }}>
          {avatarUrl ? <img src={avatarUrl} alt="" width={48} height={48} /> : <span>🎲</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, color: "#eaf6ff" }}>
          <div style={{ fontWeight: 800 }}>{displayName}</div>
          <div style={{ fontSize: 12, color: "rgba(210,230,255,.85)" }}>VIP 等級：{vipTier}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <div className="lb-btn">錢包：{wallet}</div>
        <div className="lb-btn">銀行：{bank}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 12 }}>
        <a className="lb-btn" href="/checkin">簽到</a>
        <a className="lb-btn" href="/leaderboard">排行</a>
        <a className="lb-btn" href="/rewards">活動</a>
      </div>
    </div>
  );
}
