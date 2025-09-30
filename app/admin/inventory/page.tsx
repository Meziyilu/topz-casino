"use client";
import "@/public/styles/inventory.css";
import { useState } from "react";

export default function AdminInventoryPage() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<any>(null);

  async function load() {
    const r = await fetch(`/api/admin/inventory?userId=${encodeURIComponent(userId)}`, { cache:"no-store" });
    const j = await r.json(); if (j.ok) setData(j.data);
  }

  return (
    <main className="admin inventory">
      <h1>玩家背包檢視</h1>
      <div className="admin-bar">
        <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="User ID" />
        <button onClick={load} disabled={!userId}>查詢</button>
      </div>

      {data && (
        <>
          <div className="admin-user glass">
            <div><b>User:</b> {data.user?.displayName} ({data.user?.id})</div>
            <div><b>頭框：</b> {data.user?.headframe ?? "NONE"}</div>
          </div>

          <h3>背包項</h3>
          <table className="adm-table">
            <thead><tr><th>Type</th><th>refId</th><th>qty</th><th>equipped</th><th>acquiredAt</th></tr></thead>
            <tbody>
              {data.items.map((it:any)=>(
                <tr key={it.id}>
                  <td>{it.type}</td>
                  <td>{it.refId ?? "-"}</td>
                  <td>{it.quantity}</td>
                  <td>{it.equipped ? "✔" : "-"}</td>
                  <td>{new Date(it.acquiredAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>頭框擁有</h3>
          <table className="adm-table">
            <thead><tr><th>Code</th><th>expiresAt</th></tr></thead>
            <tbody>
              {data.headframes.map((h:any)=>(
                <tr key={h.id}>
                  <td>{h.code}</td>
                  <td>{h.expiresAt ? new Date(h.expiresAt).toLocaleDateString() : "永久"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>徽章</h3>
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Pinned</th><th>Level</th></tr></thead>
            <tbody>
              {data.badges.map((b:any)=>(
                <tr key={b.id}>
                  <td>{b.badge?.name ?? "-"}</td>
                  <td>{b.pinned ? "📌" : "-"}</td>
                  <td>{b.level}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>收藏品</h3>
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Qty</th><th>Favorite</th></tr></thead>
            <tbody>
              {data.collectibles.map((c:any)=>(
                <tr key={c.id}>
                  <td>{c.collectible?.name ?? "-"}</td>
                  <td>{c.quantity}</td>
                  <td>{c.favorite ? "★" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
