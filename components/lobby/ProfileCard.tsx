// components/lobby/ProfileCard.tsx
import React from "react";
import Link from "next/link";

export type ProfileCardProps = {
  displayName: string;
  avatarUrl?: string;
  vipTier: number;
  wallet: number;
  bank: number;
  headframe?: string;
  panelTint?: string;
};

export default function ProfileCard({
  displayName,
  avatarUrl,
  vipTier,
  wallet,
  bank,
  headframe,
  panelTint,
}: ProfileCardProps) {
  const frameClass = headframe ? `hf-${String(headframe).toLowerCase()}` : "hf-none";
  const tintStyle = panelTint
    ? ({ ["--pf-tint" as any]: panelTint } as React.CSSProperties)
    : undefined;

  return (
    <div className="lb-card lb-profile" style={tintStyle}>
      <div className="lb-profile-top">
        <div className={`lb-avatar ${frameClass}`}>
          <div className="lb-ava-core">
            {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <div className="lb-ava-fallback">👤</div>}
          </div>
          <div className="lb-ava-frame" />
          <div className="lb-ava-glow" />
        </div>

        <div className="lb-user">
          <div className="lb-name">{displayName}</div>
          <div className="lb-vip">VIP {vipTier}</div>
        </div>
      </div>

      <div className="lb-balance">
        <div className="lb-b-item">
          <span>錢包</span>
          <b>{wallet.toLocaleString()}</b>
        </div>
        <div className="lb-b-item">
          <span>銀行</span>
          <b>{bank.toLocaleString()}</b>
        </div>
      </div>

      <div className="lb-profile-actions">
        <Link href="/profile" className="lb-btn small">個人資料</Link>
        <Link href="/wallet" className="lb-btn small ghost">錢包/銀行</Link>
      </div>
    </div>
  );
}
