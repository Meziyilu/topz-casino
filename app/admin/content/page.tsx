// app/admin/content/page.tsx
"use client";

import { useEffect, useState } from "react";

type Ann = { id:string; title:string; content:string; priority:number; enabled:boolean; startAt?:string|null; endAt?:string|null };
type Marq = { id:string; text:string; priority:number; enabled:boolean };

export default function ContentPage(){
  const [anns, setAnns] = useState<Ann[]>([]);
  const [marqs, setMarqs] = useState<Marq[]>([]);
  const [a, setA] = useState<Partial<Ann>>({ enabled:true, priority:0 });
  const [m, setM] = useState<Partial<Marq>>({ enabled:true, priority:0 });
  const [msg, setMsg] = useState<string>("");

  async function load(){
    const A = await fetch("/api/admin/announcements").then(r=>r.json()).catch(()=>({items:[]}));
    const M = await fetch("/api/admin/marquees").then(r=>r.json()).catch(()=>({items:[]}));
    setAnns(A.items||[]); setMarqs(M.items||[]);
  }
  useEffect(()=>{ load(); },[]);

  async function createAnn(){
    setMsg("");
    const res = await fetch("/api/admin/announcements", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(a) });
    setMsg(res.ok?"公告已新增 ✅":"公告新增失敗 ❌");
    await load();
  }
  async function createMarq(){
    setMsg("");
    const res = await fetch("/api/admin/marquees", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(m) });
    setMsg(res.ok?"跑馬燈已新增 ✅":"跑馬燈新增失敗 ❌");
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">內容管理（公告 & 跑馬燈）</h1>

      <section className="rounded-lg bg-white border p-4 space-y-3">
        <div className="font-medium">新增公告</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2" placeholder="標題" value={a.title||""} onChange={e=>setA({...a,title:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="優先權(數字越大越前)" type="number" value={a.priority??0} onChange={e=>setA({...a,priority:parseInt(e.target.value||"0",10)})}/>
          <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="內容" value={a.content||""} onChange={e=>setA({...a,content:e.target.value})}/>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!a.enabled} onChange={e=>setA({...a,enabled:e.target.checked})}/>啟用</label>
          <div className="md:col-span-2 flex gap-2">
            <input className="border rounded px-3 py-2" placeholder="起始時間(ISO，可選)" value={a.startAt||""} onChange={e=>setA({...a,startAt:e.target.value})}/>
            <input className="border rounded px-3 py-2" placeholder="結束時間(ISO，可選)" value={a.endAt||""} onChange={e=>setA({...a,endAt:e.target.value})}/>
          </div>
        </div>
        <button onClick={createAnn} className="bg-black text-white px-4 py-2 rounded">新增公告</button>
      </section>

      <section className="rounded-lg bg-white border p-4 space-y-3">
        <div className="font-medium">新增跑馬燈</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="文字" value={m.text||""} onChange={e=>setM({...m,text:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="優先權" type="number" value={m.priority??0} onChange={e=>setM({...m,priority:parseInt(e.target.value||"0",10)})}/>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!m.enabled} onChange={e=>setM({...m,enabled:e.target.checked})}/>啟用</label>
        </div>
        <button onClick={createMarq} className="bg-black text-white px-4 py-2 rounded">新增跑馬燈</button>
      </section>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white border p-4">
          <div className="font-medium mb-2">公告列表</div>
          <ul className="list-disc pl-5 space-y-1">
            {anns.map(a=><li key={a.id}>{a.enabled?"✅":"⛔"} [{a.priority}] {a.title}</li>)}
          </ul>
        </div>
        <div className="rounded-lg bg-white border p-4">
          <div className="font-medium mb-2">跑馬燈列表</div>
          <ul className="list-disc pl-5 space-y-1">
            {marqs.map(m=><li key={m.id}>{m.enabled?"✅":"⛔"} [{m.priority}] {m.text}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
