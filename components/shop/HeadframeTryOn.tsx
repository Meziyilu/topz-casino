"use client";
import { useEffect, useState } from "react";
import AvatarWithFrame from "@/components/profile/AvatarWithFrame";

type Sku = { id: string; payloadJson: any; priceOverride?: number|null; currencyOverride?: string|null };

export default function HeadframeTryOn({
  open, onClose, item, me,
}: { open: boolean; onClose: ()=>void; item: any; me?: { avatarUrl?: string } | null; }) {
  const [selected, setSelected] = useState<string>(item?.skus?.[0]?.id || "");
  useEffect(()=>{ if(open) setSelected(item?.skus?.[0]?.id || ""); },[open, item]);

  const cur = item?.skus?.find((s:Sku)=>s.id===selected);
  const frameUrl = item?.imageUrl; // 如要每 SKU 自帶不同素材，可放 payloadJson.frameUrl

  return (
    <div className={`modal ${open?"open":""}`}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-body">
        <div className="modal-header">
          <h3>試戴：{item?.title}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="tryon-grid">
          <div className="left">
            <AvatarWithFrame avatarUrl={me?.avatarUrl} frameUrl={frameUrl} size={200} />
            <div className="hint">（顯示你的頭像 + 商品頭框預覽）</div>
          </div>
          <div className="right">
            <label>方案 / SKU</label>
            <select value={selected} onChange={(e)=>setSelected(e.target.value)}>
              {item?.skus?.map((s: Sku) => (
                <option key={s.id} value={s.id}>
                  {s?.payloadJson?.durationDays ? `${s.payloadJson.durationDays} 天` : "永久"}
                </option>
              ))}
            </select>
            <div className="thumbs">
              <div className="thumb active">{item?.imageUrl ? <img src={item.imageUrl} alt="frame" /> : <div className="noimg">無圖</div>}</div>
            </div>
            <p className="desc">{item?.description || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
