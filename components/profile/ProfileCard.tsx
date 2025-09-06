"use client";
import React from "react";
import Link from "next/link";

type Props = {
  displayName: string;
  avatarUrl?: string;
  vipTier: number;
  wallet: number;
  bank: number;
  /** 新增：頭框代碼，可選 */
  headframe?: string | null;
  /** 新增：面板色，可選（HEX 或 key） */
  panelTint?: string | null;
};

export default function ProfileCard({
  displayName,
  avatarUrl,
  vipTier,
  wallet,
  bank,
  headframe,
  panelTint,
}: Props) {
  // 有做頭框樣式時可用；現在先不依賴樣式也不會壞
  const hfClass = headframe ? `hf-${String(headframe).toLowerCase()}` : "hf-none";
  const tintStyle = panelTint
    ? ({ ["--pf-tint" as any]: panelTint } as React.CSSProperties)
    : undefined;

  return (
    <div className="lb-card">
      <div className="lb-card-title">我的資料</div>

      <div className="lb-profile">
        <div className={`lb-avatar ${hfClass}`} style={tintStyle}>
          <div className="lb-ava-core">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" />
            ) : (
              <div className="lb-ava-fallback">👤</div>
            )}
          </div>
          {/* 若未加頭框樣式檔，下面兩層不會造成錯誤 */}
          <div className="lb-ava-frame" />
          <div className="lb-ava-glow" />
        </div>

        <div className="lb-user">
          <div className="lb-name">{displayName}</div>
          <div className="lb-vip">VIP {vipTier}</div>
          <div className="lb-balance">
            <div className="lb-bal">
              <span>錢包</span>
              <b>{wallet.toLocaleString()}</b>
            </div>
            <div className="lb-bal">
              <span>銀行</span>
              <b>{bank.toLocaleString()}</b>
            </div>
          </div>
          <div className="lb-actions-row">
            <Link href="/profile" className="lb-btn">編輯個人資料</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
