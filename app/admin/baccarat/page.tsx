'use client';

import { useEffect, useMemo, useState } from 'react';

type RoomCode = 'R30'|'R60'|'R90';
type Phase = 'BETTING'|'REVEALING'|'SETTLED';

type StateResp = {
  ok: boolean;
  room: { code: RoomCode; name: string; durationSeconds: number };
  roundId: string | null;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: 'PLAYER'|'BANKER'|'TIE'; p:number; b:number };
};

const ROOMS: RoomCode[] = ['R30','R60','R90'];

export default function AdminBaccaratPage() {
  const [states, setStates] = useState<Record<RoomCode, StateResp | null>>({ R30:null, R60:null, R90:null });
  const [paused, setPaused] = useState<Record<RoomCode, boolean>>({ R30:false, R60:false, R90:false });
  const [msg, setMsg] = useState('');

  async function load(room: RoomCode) {
    const r1 = await fetch(`/api/casino/baccarat/state?room=${room}`, { cache:'no-store' });
    const s  = await r1.json();
    setStates(prev => ({...prev, [room]: s }));
    // 查 paused
    const r2 = await fetch(`/api/admin/baccarat/pause?room=${room}`, { method:'GET' }).catch(()=>null);
    // 可選：也做一支 GET 查 paused；這裡簡化略過，初始化用 false
  }

  useEffect(() => {
    const tick = async () => { for (const r of ROOMS) await load(r); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function setRoomPaused(room: RoomCode, val: boolean) {
    const res = await fetch(`/api/admin/baccarat/pause?room=${room}&paused=${val}`, { method:'POST' });
    const j = await res.json();
    if (j.ok) setPaused(p => ({ ...p, [room]: val }));
    setMsg(`${room} ${val ? '已暫停' : '已恢復'}`);
  }

  async function forceNew(room: RoomCode) {
    const res = await fetch(`/api/admin/baccarat/force-new?room=${room}`, { method:'POST' });
    const j = await res.json();
    if (j.ok) setMsg(`${room} 已強制換下一局`);
  }

  return (
    <main className="admin-wrap">
      <h1>百家樂自動機（管理）</h1>
      <p className="muted">背景 Worker 會自動開局/開牌/結算/下一局。這裡只有暫停/恢復、強制換下一局。</p>
      {msg && <div className="msg">{msg}</div>}

      <div className="rooms">
        {ROOMS.map((room) => {
          const s = states[room];
          return (
            <div key={room} className="room-card">
              <div className="head">
                <div className="name">{s?.room?.name ?? room}</div>
                <div className={`phase ${s?.phase?.toLowerCase()}`}>{s?.phase ?? '-'}</div>
              </div>
              <div className="body">
                <div>局序：{s?.roundSeq ?? '-'}</div>
                <div>倒數：{typeof s?.secLeft === 'number' ? `${s?.secLeft}s` : '—'}</div>
                <div>結果：{s?.result?.outcome ?? '—'}（閒{s?.result?.p ?? 0} / 莊{s?.result?.b ?? 0}）</div>
              </div>
              <div className="actions">
                <button onClick={() => setRoomPaused(room, !paused[room])}>
                  {paused[room] ? '恢復' : '暫停'}
                </button>
                <button onClick={() => forceNew(room)}>強制換下一局</button>
              </div>
            </div>
          );
        })}
      </div>

      <link rel="stylesheet" href="/style/admin/baccarat.css" />
    </main>
  );
}
