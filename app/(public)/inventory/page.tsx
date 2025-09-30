"use client";
import "@/public/styles/inventory.css";
import { useEffect, useState, useMemo } from "react";
import InventoryToolbar from "@/components/inventory/InventoryToolbar";
import EquipBar from "@/components/inventory/EquipBar";
import InventoryGrid from "@/components/inventory/InventoryGrid";

export default function InventoryPage() {
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<"ALL"|"HEADFRAME"|"BADGE"|"COLLECTIBLE"|"OTHER">("ALL");
  const [q, setQ] = useState("");

  async function load() {
    const r = await fetch("/api/inventory/list", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setData(j.data);
  }
  useEffect(()=>{ load(); }, []);

  const items = useMemo(()=>{
    const arr = data?.items ?? [];
    const byType = filter==="ALL" ? arr : arr.filter((x:any)=>x.type===filter);
    const byQ = q.trim()? byType.filter((x:any)=>(x.refId??"").toLowerCase().includes(q.toLowerCase())) : byType;
    return byQ;
  }, [data, filter, q]);

  return (
    <main className="inventory-wrap">
      <header className="inv-head glass">
        <h1>我的背包</h1>
        <p className="sub">管理頭框、徽章、收藏品與其他道具。右上角可依類型/關鍵字篩選。</p>
      </header>

      <EquipBar me={data?.user} headframes={data?.headframes} badges={data?.badges} onChanged={load} />

      <InventoryToolbar filter={filter} setFilter={setFilter} q={q} setQ={setQ} />

      <InventoryGrid
        items={items}
        collectibles={data?.collectibles ?? []}
        badges={data?.badges ?? []}
        onChanged={load}
      />
    </main>
  );
}
