'use client';
import Link from 'next/link';

export default function BaccaratIndex(){
  const rooms = [
    { code:'R30', name:'R30 • 快節奏' },
    { code:'R60', name:'R60 • 標準' },
    { code:'R90', name:'R90 • 慢節奏' }
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">百家樂房間</h1>
      <div className="grid-auto">
        {rooms.map(r=> (
          <Link key={r.code} href={`/casino/baccarat/rooms/${r.code}`} className="card p-6 hover:bg-white/10">{r.name}</Link>
        ))}
      </div>
    </div>
  );
}