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
      <div className="pf-avatar-wrap">
        <div className={`pf-avatar ${frameClass}`}>
          <div className="pf-ava-core">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" />
            ) : (
              <div className="pf-ava-fallback">👤</div>
            )}
          </div>
          <div className="pf-ava-frame" />
          <div className="pf-ava-glow" />
        </div>

        <div className="pf-user">
          <div className="pf-name">{displayName}</div>
          <div className="pf-vip">VIP {vipTier}</div>
        </div>
      </div>

      <div className="pf-balances">
        <div className="pf-bal">
          <span>錢包</span>
          <b>{wallet.toLocaleString()}</b>
        </div>
        <div className="pf-bal">
          <span>銀行</span>
          <b>{bank.toLocaleString()}</b>
        </div>
      </div>

      <div className="pf-actions">
        <Link href="/profile" className="pf-btn small">個人資料</Link>
        <Link href="/wallet" className="pf-btn small ghost">錢包/銀行</Link>
      </div>
    </div>
  );
}
