"use client";
import Link from "next/link";

export type InventorySummary = {
  user: { headframe: string | null };
  pinnedBadges: Array<{ id: string; name: string; iconUrl?: string | null }>;
  headframes: Array<{ code: string; expiresAt: string | null }>;
  counts: { HEADFRAME: number; BADGE: number; COLLECTIBLE: number; OTHER: number; TOTAL: number };
  recent: Array<{ id: string; type: string; refId?: string | null; acquiredAt: string }>;
};

export default function InventoryDock({ data }: { data: InventorySummary | null }) {
  return (
    <div className="lb-card inv-dock glass">
      <div className="lb-card-title">我的背包</div>

      {!data ? (
        <div className="lb-muted">載入中…</div>
      ) : (
        <>
          {/* 頭框 + 徽章 */}
          <div className="inv-dock__equip">
            <div className={`inv-dock__frame frame-${data.user.headframe ?? "NONE"}`}>
              <div className="inv-dock__avatar" />
            </div>
            <div className="inv-dock__badges">
              {data.pinnedBadges.length ? (
                data.pinnedBadges.slice(0, 3).map((b) => (
                  <img key={b.id} className="inv-dock__badge" src={b.iconUrl ?? "/badge.png"} alt={b.name} title={b.name} />
                ))
              ) : (
                <span className="lb-muted">尚未釘選徽章</span>
              )}
            </div>
          </div>

          {/* 統計 */}
          <div className="inv-dock__stats">
            <div className="stat"><b>{data.counts.HEADFRAME}</b><span>頭框</span></div>
            <div className="stat"><b>{data.counts.BADGE}</b><span>徽章</span></div>
            <div className="stat"><b>{data.counts.COLLECTIBLE}</b><span>收藏品</span></div>
            <div className="stat"><b>{data.counts.OTHER}</b><span>其他</span></div>
          </div>

          {/* 最近取得 */}
          <div className="inv-dock__recent">
            <div className="subttl">最近取得</div>
            {data.recent.length ? (
              <ul>
                {data.recent.slice(0, 6).map((it) => (
                  <li key={it.id}>
                    <span className="t">{it.type}</span>
                    <span className="r">#{it.refId ?? "-"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="lb-muted">暫無項目</div>
            )}
          </div>

          <div className="inv-dock__actions">
            <Link href="/inventory" className="lb-btn-mini">開啟完整背包</Link>
          </div>
        </>
      )}
    </div>
  );
}
