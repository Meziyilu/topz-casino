// components/profile/ProfileCard.tsx
'use client';

export default function ProfileCard(props: {
  displayName: string;
  avatarUrl?: string | null;
  vipTier: number;
}) {
  return (
    <div className="pf-card pf-usercard">
      <div className="pf-avatar">
        {props.avatarUrl ? <img src={props.avatarUrl} alt="avatar" /> : <div className="pf-avatar-ph">🙂</div>}
        <div className="pf-frame" />
      </div>
      <div className="pf-userinfo">
        <div className="pf-name">{props.displayName}</div>
        <div className="pf-meta">VIP {props.vipTier ?? 0}</div>
      </div>
    </div>
  );
}
