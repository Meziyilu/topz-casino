"use client";
import { useEffect, useState } from "react";

async function jget(url:string){ const r = await fetch(url,{ cache:"no-store" }); return r.json(); }
async function jpost(url:string, body:any){ const r = await fetch(url,{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body)}); return r.json(); }

export default function AdminBaccarat(){
  const [data,setData] = useState<any>(null);
  useEffect(()=>{ jget("/api/casino/baccarat/admin/state").then(setData); },[]);
  return (
    <div style={{padding:24}}>
      <h1>百家樂管理</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {(data?.rooms||[]).map((r:any)=>(
          <div key={r.room} style={{border:"1px solid #333",borderRadius:8,padding:16}}>
            <h3>{r.room}</h3>
            <div>局序：{r.round?.seq}</div>
            <div>階段：{r.round?.phase}</div>
            <div>倒數：{r.timers?.endInSec}s</div>
            <div>總局數：{r.totalRounds}</div>
            <div style={{marginTop:12}}>
              <button onClick={async()=>{await jpost("/api/casino/baccarat/admin/reset",{ room:r.room }); location.reload();}}>重啟當局</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
