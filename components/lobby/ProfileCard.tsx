"use client";

import React from "react";
import Link from "next/link";

type Props = {
  displayName: string;
  avatarUrl?: string;
  vipTier: number;
  wallet: number;
  bank: number;
  // 新增：讓大廳同步特效
  headframe?: string;
  panelTint?: string;
};

// 可選：跟個人頁同邏輯，讓頭像自動裁成圓形、臉部置中
function avatarUrl256(url?: string) {
  if (!url) return "";
  return url.replace(
    "/upload/",
    "/upload/w_96,h_96,c_fill,g_face,r_max,f_auto,q_auto/"
  );
}

export default function ProfileCard({
  displayName,
  avatarUrl,
  vipTier,
  wallet,
  bank,
  headframe,
  panelTint,
}: Props) {
  const ava = avatarUrl256(avatarUrl);

  return (
    <div className="lb-card lb-profile">
      <div
        className={`lb-ava ${headframe ? `hf-${headframe.toLowerCase()}` : "hf-none"}`}
        style={
          panelTint ? ({ ["--pf-tint" as any]: panelTint } as React.CSSProperties) : undefined
        }
      >
        <div className="lb-ava-core">
          {ava ? <img src={ava} alt="avatar" /> : <div className="lb-ava-fallback">👤</div>}
        </div>
        <div className="lb-ava-frame" />
        <div className="lb-ava-glow" />
      </div>

      <div className="lb-profile-main">
        <div className="lb-name">{displayName}</div>
        <div className="lb-vip">VIP {vipTier}</div>

        <div className="lb-bals">
          <div className="lb-bal">
            <span>錢包</span>
            <b>{wallet.toLocaleString()}</b>
          </div>
          <div className="lb-bal">
            <span>銀行</span>
            <b>{bank.toLocaleString()}</b>
          </div>
        </div>

        <div className="lb-actions">
          <Link href="/profile" className="lb-btn">個人資料</Link>
        </div>
      </div>
    </div>
  );
}
