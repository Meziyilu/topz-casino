// components/lobby/ProfileCard.tsx
import React from "react";
import Link from "next/link";

type ProfileCardProps = {
  displayName: string;
  avatarUrl?: string;
  vipTier: number;
  wallet: number;
  bank: number;
  /** 新增：頭框代碼（用於加上對應 CSS 類名，例如 hf-gold / hf-neon） */
  headframe?: string;
  /** 新增：面板/霓虹色彩（傳 HEX 或預設 key），會寫到 CSS 變數 --pf-tint */
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
  // 準備頭框類名與 tint 變數（可不傳，樣式就走預設）
  const frameClass = headframe ? `hf-${String(headframe).toLowerCase()}` : "hf-none";
  const tintStyle = panelTint
    ? ({ ["--pf-tint" as any]: panelTint } as React.CSSProperties)
    : undefined;

  return (
    <div className="lb-card lb-profile" style={tintStyle}>
      <div className="lb-profile-top">
        <div className={`lb-avatar ${frameClass}`}>
          <div className="lb-ava-core">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" />
            ) : (
              <div className="lb-ava-fallback">👤</div>
            )}
          </div>
          {/* 這兩層給頭框/光暈用；對應你的 CSS（若沒有會被忽略，不影響佈局） */}
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
        <Link href="/profile" className="lb-btn small">
          個人資料
        </Link>
        <Link href="/wallet" className="lb-btn small ghost">
          錢包/銀行
        </Link>
      </div>
    </div>
  );
}
