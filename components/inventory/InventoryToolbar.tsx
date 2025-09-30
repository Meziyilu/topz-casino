"use client";
export default function InventoryToolbar({ filter, setFilter, q, setQ }:{
  filter: "ALL"|"HEADFRAME"|"BADGE"|"COLLECTIBLE"|"OTHER";
  setFilter: (v:any)=>void;
  q: string;
  setQ: (v:string)=>void;
}) {
  return (
    <section className="inv-toolbar">
      <div className="left"></div>
      <div className="right">
        <select value={filter} onChange={e=>setFilter(e.target.value as any)}>
          <option value="ALL">全部</option>
          <option value="HEADFRAME">頭框</option>
          <option value="BADGE">徽章</option>
          <option value="COLLECTIBLE">收藏品</option>
          <option value="OTHER">其他</option>
        </select>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="以 refId 搜尋…" />
      </div>
    </section>
  );
}
