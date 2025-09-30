"use client";
import ItemCard from "./ItemCard";

export default function InventoryGrid({ items, collectibles, badges, onChanged }:{
  items:any[]; collectibles:any[]; badges:any[]; onChanged:()=>void;
}) {
  return (
    <>
      <section className="inv-grid">
        {items.map((it)=>(
          <ItemCard key={it.id} it={it} onChanged={onChanged} />
        ))}
        {!items.length && <p className="empty">目前沒有物品。</p>}
      </section>

      <section className="inv-collectibles glass">
        <h3>收藏品</h3>
        <div className="col-grid">
          {collectibles.map((c:any)=>(
            <div className="col-card" key={c.id}>
              <div className="title">{c.collectible?.name ?? "Collectible"}</div>
              <div className="row">
                <span>數量</span><b>x{c.quantity}</b>
              </div>
              <div className="row">
                <span>最愛</span>
                <button onClick={async ()=>{
                  await fetch("/api/inventory/item/update", { method:"POST", body: JSON.stringify({
                    kind: "COLLECTIBLE", id: c.id, favorite: !c.favorite
                  })});
                  onChanged();
                }}>
                  {c.favorite? "取消": "設為最愛"}
                </button>
              </div>
            </div>
          ))}
          {!collectibles.length && <p className="empty">沒有收藏品。</p>}
        </div>
      </section>
    </>
  );
}
