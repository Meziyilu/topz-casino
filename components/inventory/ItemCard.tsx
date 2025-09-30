"use client";
import { useState } from "react";

export default function ItemCard({ it, onChanged }:{ it:any; onChanged:()=>void }) {
  const [busy, setBusy] = useState(false);

  async function equipOther() {
    setBusy(true);
    await fetch("/api/inventory/equip", { method:"POST", body: JSON.stringify({
      type: "OTHER", inventoryId: it.id
    })});
    setBusy(false); onChanged();
  }
  async function unequipOther() {
    setBusy(true);
    await fetch("/api/inventory/unequip", { method:"POST", body: JSON.stringify({
      type: "OTHER", inventoryId: it.id
    })});
    setBusy(false); onChanged();
  }

  return (
    <div className="inv-card glass">
      <div className="meta">
        <div className="tag">{it.type}</div>
        {it.refId && <div className="ref">#{it.refId}</div>}
      </div>
      <div className="body">
        <div className="qty">數量 x{it.quantity}</div>
        {it.type==="OTHER" && (
          <div className="actions">
            {it.equipped ? (
              <button disabled={busy} onClick={unequipOther}>卸下</button>
            ) : (
              <button disabled={busy} onClick={equipOther}>裝備</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
