"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

function unit(n:number, c:"COIN"|"DIAMOND"|"TICKET"|"GACHA_TICKET"){
  if (c==="COIN") return `$${(n/100).toFixed(2)}`; return n.toString();
}
function MediaThumb({src}:{src?:string|null}){
  if (!src) return <div className="thumb noimg">—</div>;
  const isVideo = /\.(webm|mp4)$/i.test(src);
  return <div className="thumb">{isVideo ? <video src={src} autoPlay muted loop playsInline/> : <img src={src} alt="thumb" />}</div>;
}

export default function AdminShopItemsPage(){
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    kind:"HEADFRAME", currency:"DIAMOND",
    code:"", title:"", basePrice:999, imageUrl:"", description:"",
    vipDiscountable:true, visible:true,
    skus:[{ priceOverride:999, vipDiscountableOverride:null, currencyOverride:null, payloadJson:{ headframe:"NEON", durationDays:7 } }],
  });
  const [msg, setMsg] = useState("");

  async function load(){
    const r = await fetch("/api/shop/catalog", { credentials:"include", cache:"no-store" });
    const j = await r.json(); setItems(j.items || []);
  }
  useEffect(()=>{ load(); },[]);

  async function create(){
    setMsg("");
    const r = await fetch("/api/shop/admin/item", {
      method:"POST", credentials:"include", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    if (!r.ok){ setMsg(j?.error || "建立失敗"); return; }
    setMsg("建立成功"); setForm({...form, code:"", title:""}); load();
  }

  return (
    <main className="admin-shop">
      <h1>商店管理 / 商品</h1>

      <section className="list">
        <h2>現有商品</h2>
        <table>
          <thead><tr><th>圖片</th><th>代碼</th><th>名稱</th><th>類型</th><th>幣別</th><th>最低價</th><th>限量</th></tr></thead>
          <tbody>{items.map(it=>(
            <tr key={it.id}>
              <td><MediaThumb src={it.imageUrl} /></td>
              <td>{it.code}</td><td>{it.title}</td><td>{it.kind}</td>
              <td>{it.currency}</td><td>{unit(it.priceFrom, it.currency)}</td>
              <td>{it.limitedQty ?? "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <section className="form">
        <h2>新增商品</h2>
        <div className="grid">
          <label>類型</label>
          <select value={form.kind} onChange={e=>setForm({...form, kind:e.target.value})}>
            <option>HEADFRAME</option><option>BADGE</option><option>BUNDLE</option><option>CURRENCY</option><option>OTHER</option>
          </select>

          <label>結帳幣別</label>
          <select value={form.currency} onChange={e=>setForm({...form, currency:e.target.value})}>
            <option>COIN</option><option>DIAMOND</option><option>TICKET</option><option>GACHA_TICKET</option>
          </select>

          <label>代碼</label>
          <input value={form.code} onChange={e=>setForm({...form, code:e.target.value})}/>

          <label>名稱</label>
          <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>

          <label>底價</label>
          <input type="number" value={form.basePrice} onChange={e=>setForm({...form, basePrice:parseInt(e.target.value||"0")})}/>
          <small>COIN 用分；其他幣用整數</small>

          <label>圖片 URL</label>
          <input value={form.imageUrl} onChange={e=>setForm({...form, imageUrl:e.target.value})}/>

          <label>預覽</label>
          <div className="preview-box"><MediaThumb src={form.imageUrl || undefined} /></div>

          <label>說明</label>
          <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
          
          <label>VIP 可折</label>
          <input type="checkbox" checked={form.vipDiscountable} onChange={e=>setForm({...form, vipDiscountable:e.target.checked})}/>

          <label>顯示</label>
          <input type="checkbox" checked={form.visible} onChange={e=>setForm({...form, visible:e.target.checked})}/>
        </div>

        <h3>SKU（至少 1 筆）</h3>
        {form.skus.map((s:any, i:number)=>(
          <div key={i} className="sku">
            <label>覆蓋價</label>
            <input type="number" value={s.priceOverride ?? ""} onChange={e=>{
              const v = e.target.value === "" ? null : parseInt(e.target.value);
              const skus = [...form.skus]; skus[i] = {...s, priceOverride: v}; setForm({...form, skus});
            }}/>
            <label>VIP 覆蓋可折</label>
            <input type="checkbox" checked={!!s.vipDiscountableOverride} onChange={e=>{
              const skus = [...form.skus]; skus[i] = {...s, vipDiscountableOverride: e.target.checked}; setForm({...form, skus});
            }}/>
            <label>幣別覆蓋</label>
            <select value={s.currencyOverride ?? ""} onChange={e=>{
              const v = e.target.value==="" ? null : e.target.value;
              const skus = [...form.skus]; skus[i] = {...s, currencyOverride: v}; setForm({...form, skus});
            }}>
              <option value="">（沿用商品幣別）</option>
              <option>COIN</option><option>DIAMOND</option><option>TICKET</option><option>GACHA_TICKET</option>
            </select>
            <label>Payload(JSON)</label>
            <input value={JSON.stringify(s.payloadJson)} onChange={e=>{
              try { const j = JSON.parse(e.target.value || "{}");
                const skus = [...form.skus]; skus[i] = {...s, payloadJson: j}; setForm({...form, skus}); } catch {}
            }}/>
            <small>頭框示例：{{"{"}}"headframe":"NEON","durationDays":7{{"}"}}</small>
          </div>
        ))}
        <button onClick={()=>setForm({...form, skus:[...form.skus, { priceOverride:null, vipDiscountableOverride:null, currencyOverride:null, payloadJson:{} }]})}>+ 新增 SKU</button>

        <div className="actions">
          <button onClick={create}>建立商品</button>
          {msg && <span className="msg">{msg}</span>}
        </div>
      </section>
    </main>
  );
}
