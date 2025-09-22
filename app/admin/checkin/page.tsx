"use client";

import { useEffect, useMemo, useState } from "react";
import "@/public/styles/admin-checkin.css";

type AdminConfig = { table: number[] | null; sundayBonus: number; updatedAt: string | null };

function TabButton({active, onClick, children}:{active:boolean; onClick:()=>void; children:React.ReactNode}) {
  return <button className={`admin-tab ${active?'active':''}`} onClick={onClick}>{children}</button>;
}

export default function AdminCheckinPage() {
  const [tab, setTab] = useState<"cfg"|"list"|"ops">("cfg");

  return (
    <div className="admin-shell">
      <div className="admin-title">簽到（Check-in）管理</div>
      <div className="admin-tabs">
        <TabButton active={tab==="cfg"} onClick={()=>setTab("cfg")}>設定</TabButton>
        <TabButton active={tab==="list"} onClick={()=>setTab("list")}>紀錄</TabButton>
        <TabButton active={tab==="ops"} onClick={()=>setTab("ops")}>人工</TabButton>
      </div>

      {tab==="cfg" && <ConfigPanel />}
      {tab==="list" && <ClaimsPanel />}
      {tab==="ops" && <OpsPanel />}
    </div>
  );
}

/** === 設定：30 天表 + 週日加碼 === */
function ConfigPanel(){
  const [cfg, setCfg] = useState<AdminConfig | null>(null);
  const [vals, setVals] = useState<number[]>(Array(30).fill(0));
  const [bonus, setBonus] = useState<number>(5000);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load(){
    const res = await fetch("/api/admin/checkin/config", { cache:"no-store" });
    const data = await res.json();
    setCfg(data);
    setVals(Array.isArray(data.table) ? data.table : Array(30).fill(0));
    setBonus(Number(data.sundayBonus ?? 5000));
  }

  useEffect(()=>{ load(); },[]);

  async function save(){
    setSaving(true); setMsg(null);
    try{
      const res = await fetch("/api/admin/checkin/config", {
        method:"PUT",
        headers: { "content-type":"application/json" },
        body: JSON.stringify({ table: vals.map(v=>Number(v||0)), sundayBonus: Number(bonus||0) }),
      });
      if(!res.ok){ throw new Error(await res.text()); }
      setMsg("已儲存");
      await load();
    }catch(e:any){
      setMsg("儲存失敗");
    }finally{ setSaving(false); }
  }

  return (
    <div className="admin-card">
      <div className="admin-title">簽到設定</div>
      <div className="admin-row">
        <div style={{ fontSize:12, color:"var(--pf-muted,#8ea0bf)" }}>
          最近更新：{cfg?.updatedAt ? new Date(cfg.updatedAt).toLocaleString() : "—"}
        </div>
      </div>

      {/* 1~15 */}
      <div className="admin-row">
        <div style={{fontWeight:700}}>Day 1–15</div>
      </div>
      <div className="admin-grid-15">
        {vals.slice(0,15).map((v,i)=>(
          <div key={i}>
            <div style={{fontSize:12, color:"var(--pf-muted,#8ea0bf)", marginBottom:4}}>Day {i+1}</div>
            <input
              className="admin-input" type="number" min={0} value={v}
              onChange={e=>{
                const n = [...vals]; n[i] = Number(e.target.value || 0); setVals(n);
              }}
            />
          </div>
        ))}
      </div>

      {/* 16~30 */}
      <div className="admin-row" style={{marginTop:12}}>
        <div style={{fontWeight:700}}>Day 16–30</div>
      </div>
      <div className="admin-grid-15">
        {vals.slice(15,30).map((v,i)=>(
          <div key={i+15}>
            <div style={{fontSize:12, color:"var(--pf-muted,#8ea0bf)", marginBottom:4}}>Day {i+16}</div>
            <input
              className="admin-input" type="number" min={0} value={v}
              onChange={e=>{
                const n = [...vals]; n[i+15] = Number(e.target.value || 0); setVals(n);
              }}
            />
          </div>
        ))}
      </div>

      <div className="admin-row" style={{marginTop:14}}>
        <label>週日加碼：</label>
        <input className="admin-input" type="number" min={0} value={bonus} onChange={e=>setBonus(Number(e.target.value||0))}/>
        <button className="admin-btn" onClick={save} disabled={saving}>{saving?"儲存中…":"儲存"}</button>
        {msg && <span style={{marginLeft:8, color:"var(--pf-muted,#8ea0bf)"}}>{msg}</span>}
        <button className="admin-btn ghost" onClick={load}>重載</button>
      </div>
    </div>
  );
}

/** === 紀錄查詢 === */
function ClaimsPanel(){
  const [userId,setUserId] = useState("");
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [limit,setLimit] = useState(50);
  const [list,setList] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);

  async function search(){
    setLoading(true);
    const q = new URLSearchParams();
    if(userId) q.set("userId", userId);
    if(from) q.set("from", new Date(from).toISOString());
    if(to) q.set("to", new Date(to).toISOString());
    q.set("limit", String(limit));
    const res = await fetch(`/api/admin/checkin/claims?${q.toString()}`, { cache:"no-store" });
    const data = await res.json();
    setList(data.list ?? []);
    setLoading(false);
  }

  useEffect(()=>{ search(); },[]);

  return (
    <div className="admin-card">
      <div className="admin-title">簽到紀錄</div>
      <div className="admin-row">
        <input className="admin-input" placeholder="userId" value={userId} onChange={e=>setUserId(e.target.value)} />
        <input className="admin-input" type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} />
        <input className="admin-input" type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} />
        <input className="admin-input" type="number" min={1} max={200} value={limit} onChange={e=>setLimit(Number(e.target.value||50))} />
        <button className="admin-btn" onClick={search} disabled={loading}>{loading?"讀取中…":"搜尋"}</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>時間</th><th>YMD</th><th>金額</th><th>Streak 前/後</th><th>User</th><th>ClaimId</th>
          </tr>
        </thead>
        <tbody>
          {list.map((it:any)=>(
            <tr key={it.id}>
              <td>{new Date(it.createdAt).toLocaleString()}</td>
              <td>{new Date(it.ymd).toLocaleDateString()}</td>
              <td>{it.amount}</td>
              <td>{it.streakBefore} → {it.streakAfter}</td>
              <td>{it.user?.displayName ?? it.user?.email ?? it.userId}</td>
              <td>{it.id}</td>
            </tr>
          ))}
          {list.length===0 && <tr><td colSpan={6} style={{color:"var(--pf-muted,#8ea0bf)"}}>無資料</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/** === 人工作業（補發/撤銷）=== */
function OpsPanel(){
  const [grantUserId,setGrantUserId] = useState("");
  const [grantYmd,setGrantYmd] = useState(""); // datetime-local（會被轉 ISO）
  const [grantAmount,setGrantAmount] = useState(1000);
  const [grantNote,setGrantNote] = useState("");
  const [grantMsg,setGrantMsg] = useState<string|null>(null);

  const [revokeClaimId,setRevokeClaimId] = useState("");
  const [revokeNote,setRevokeNote] = useState("");
  const [revokeMsg,setRevokeMsg] = useState<string|null>(null);

  async function grant(){
    setGrantMsg(null);
    const body = {
      userId: grantUserId,
      ymd: new Date(grantYmd).toISOString(),
      amount: Number(grantAmount||0),
      note: grantNote || undefined,
    };
    const res = await fetch("/api/admin/checkin/grant", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) });
    setGrantMsg(res.ok ? "已補發" : "補發失敗");
  }
  async function revoke(){
    setRevokeMsg(null);
    const res = await fetch("/api/admin/checkin/revoke", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ claimId: revokeClaimId, note: revokeNote||undefined }) });
    setRevokeMsg(res.ok ? "已撤銷" : "撤銷失敗");
  }

  return (
    <div className="admin-card">
      <div className="admin-title">人工作業</div>

      <div className="admin-row" style={{marginTop:6}}>
        <div style={{fontWeight:700}}>補發</div>
      </div>
      <div className="admin-row">
        <input className="admin-input" placeholder="userId" value={grantUserId} onChange={e=>setGrantUserId(e.target.value)}/>
        <input className="admin-input" type="datetime-local" value={grantYmd} onChange={e=>setGrantYmd(e.target.value)}/>
        <input className="admin-input" type="number" min={1} value={grantAmount} onChange={e=>setGrantAmount(Number(e.target.value||0))}/>
        <input className="admin-input" placeholder="備註（選填）" value={grantNote} onChange={e=>setGrantNote(e.target.value)}/>
        <button className="admin-btn" onClick={grant}>補發</button>
        {grantMsg && <span style={{marginLeft:8, color:"var(--pf-muted,#8ea0bf)"}}>{grantMsg}</span>}
      </div>

      <div className="admin-row" style={{marginTop:12}}>
        <div style={{fontWeight:700}}>撤銷</div>
      </div>
      <div className="admin-row">
        <input className="admin-input" placeholder="claimId" value={revokeClaimId} onChange={e=>setRevokeClaimId(e.target.value)}/>
        <input className="admin-input" placeholder="備註（選填）" value={revokeNote} onChange={e=>setRevokeNote(e.target.value)}/>
        <button className="admin-btn ghost" onClick={revoke}>撤銷</button>
        {revokeMsg && <span style={{marginLeft:8, color:"var(--pf-muted,#8ea0bf)"}}>{revokeMsg}</span>}
      </div>
    </div>
  );
}
