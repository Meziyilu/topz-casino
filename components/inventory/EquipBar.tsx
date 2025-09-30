"use client";
import { useState } from "react";

export default function EquipBar({ me, headframes, badges, onChanged }:{
  me?: { headframe?: string }, headframes?: any[], badges?: any[], onChanged: ()=>void
}) {
  const [loading, setLoading] = useState(false);

  async function equip(code: string) {
    setLoading(true);
    await fetch("/api/inventory/equip", { method: "POST", body: JSON.stringify({ type: "HEADFRAME", refId: code })});
    setLoading(false);
    onChanged();
  }
  async function unequip() {
    setLoading(true);
    await fetch("/api/inventory/unequip", { method: "POST", body: JSON.stringify({ type: "HEADFRAME" })});
    setLoading(false);
    onChanged();
  }

  async function pinBadge(userBadgeId: string) {
    await fetch("/api/inventory/badge/pin", { method:"POST", body: JSON.stringify({ userBadgeId })});
    onChanged();
  }
  async function unpinBadge(userBadgeId: string) {
    await fetch("/api/inventory/badge/unpin", { method:"POST", body: JSON.stringify({ userBadgeId })});
    onChanged();
  }

  return (
    <section className="equip-bar glass">
      <div className="row">
        <span>目前頭框：</span>
        <b>{me?.headframe ?? "NONE"}</b>
        <button disabled={loading} onClick={unequip}>卸下</button>
      </div>

      <div className="frames">
        {headframes?.map((h:any)=>(
          <button key={h.id} onClick={()=>equip(h.code)} className="chip">
            {h.code}{h.expiresAt?`（到期：${new Date(h.expiresAt).toLocaleDateString()}）`:"（永久）"}
          </button>
        ))}
      </div>

      <div className="badges-line">
        <span>徽章釘選：</span>
        {badges?.map((b:any)=>(
          <button key={b.id}
                  onClick={()=> b.pinned ? unpinBadge(b.id) : pinBadge(b.id)}
                  className={`badge-chip ${b.pinned? "pinned":""}`}>
            {b.badge?.name ?? "Badge"} {b.pinned?"📌":""}
          </button>
        ))}
      </div>
    </section>
  );
}
