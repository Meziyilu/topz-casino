// components/lobby/ProfileCard.tsx
"use client";
import React from "react";
import Link from "next/link";

type Props = {
  displayName: string;
  avatarUrl?: string;
  vipTier: number;
  wallet: number;
  bank: number;
  /** 新增：頭框代碼（對應你的 CSS：hf-xxx） */
  headframe?: string | null;
  /** 新增：面板色（HEX 或 key），會掛在 CSS 變數 --pf-tint 上 */
  panelTint?: string | null;
};

const ProfileCard: React.FC<Props> = ({
  displayName,
  avatarUrl,
  vipTier,
  wallet,
  bank,
  headframe,
  panelTint,
}) => {
  const hfClass = headframe ? `hf-${String(headframe).toLowerCase()}` : "hf-none";
  const styleVar = panelTint ? ({ ["--pf-tint" as any]: panelTint } as React.CSSProperties) : undefined;

  return (
    <div className="lb-card">
      <div className="lb-card-title">玩家資訊</div>

      {/* 頭像 + 頭框（與個人頁同步命名） */}
      <div className="lb-profile-row">
        <div className={`pf-avatar ${hfClass}`} style={styleVar}>
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

        <div className="lb-user-meta">
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

      <div className="lb-actions" style={{ marginTop: 12 }}>
        <Link href="/profile" className="lb-btn">✏️ 編輯個人資料</Link>
      </div>
    </div>
  );
};

export default ProfileCard;
