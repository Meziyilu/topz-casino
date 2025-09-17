"use client";
import { useState, useTransition } from "react";
import HeadframeTryOn from "./HeadframeTryOn";
import { formatUnit } from "@/lib/shop";

function makeIdemKey(){ return `idem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

export default function ShopItemClient({ item, me }: { item: any; me: any }) {
  const [skuId, setSkuId] = useState<string>(item.skus[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [isPending, start] = useTransition();
  const [toast, setToast] = useState<string>("");
  const [tryOnOpen, setTryOnOpen] = useState(false);

  function priceOfSku(s:any){
    const unit = s.priceOverride ?? item.basePrice;
    const cur = s.currencyOverride ?? item.currency;
    return formatUnit(unit, cur);
  }

  async function checkout() {
    setToast("");
    const res = await fetch("/api/shop/checkout", {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ skuId, qty, idempotencyKey: makeIdemKey() }),
    });
    const data = await res.json();
    if (!res.ok) setToast(data?.error || "下單失敗");
    else setToast("購買成功！");
  }

  return (
    <>
      <div className="media-and-cta">
        <div className="media">
          {item.imageUrl ? (
            /\.(webm|mp4)$/i.test(item.imageUrl)
              ? <video className="hero" autoPlay muted loop playsInline><source src={item.imageUrl} /></video>
              : <img className="hero" src={item.imageUrl} alt={item.title} />
          ) : <div className="hero placeholder">無預覽圖</div>}
        </div>
        <div className="cta">
          {item.description && <p className="desc">{item.description}</p>}

          <label>方案 / SKU</label>
          <select value={skuId} onChange={e=>setSkuId(e.target.value)}>
            {item.skus.map((s:any)=>(
              <option key={s.id} value={s.id}>
                {priceOfSku(s)}（{s.currencyOverride ?? item.currency}）{s.payloadJson?.durationDays ? ` / ${s.payloadJson.durationDays}天` : " / 永久"}
              </option>
            ))}
          </select>

          <label>數量</label>
          <input type="number" min={1} max={99} value={qty} onChange={e=>setQty(parseInt(e.target.value||"1"))} />

          <div className="cta-row">
            <button disabled={isPending || !skuId} onClick={()=>start(checkout)}>{isPending ? "處理中..." : "立即購買"}</button>
            {item.kind === "HEADFRAME" && (<button className="ghost" onClick={()=>setTryOnOpen(true)}>試戴</button>)}
          </div>
          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>

      {item.kind === "BUNDLE" && item.bundles?.length > 0 && (
        <>
          <h2>套組內容</h2>
          <ul className="bundle">{item.bundles.map((b:any)=>(
            <li key={b.id}><span>{b.sku.item.title}</span><small>x{b.qty}</small></li>
          ))}</ul>
        </>
      )}

      {item.kind === "HEADFRAME" && (
        <HeadframeTryOn open={tryOnOpen} onClose={()=>setTryOnOpen(false)} item={item} me={me || undefined} />
      )}
    </>
  );
}
