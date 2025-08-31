'use client';

import { useEffect, useMemo, useState } from 'react';

type Period = 'today' | 'week';
type Room = 'all' | 'R30' | 'R60' | 'R90';

type Item = { userId: string; name: string; wagered: number; payout: number; profit: number; };
type Resp = {
  period: { key: Period; label: string; startISO: string; endISO: string; tz: string };
  room: string; limit: number; items: Item[];
  rules?: { bankerNoCommission: boolean; tieOdds: number; pairOdds: number; };
};

export default function Leaderboard(props: {
  defaultPeriod?: Period;
  fixedRoom?: Exclude<Room, 'all'>; // R30/R60/R90（房間頁）
  showRoomSelector?: boolean;       // 大廳 true，房間 false
  limit?: number;
  className?: string;
}) {
  const {
    defaultPeriod = 'today',
    fixedRoom,
    showRoomSelector = true,
    limit = 10,
    className = '',
  } = props;

  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [room, setRoom] = useState<Room>(fixedRoom ?? 'all');
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    const r = fixedRoom ?? room;
    return `/api/leaderboard?period=${period}&room=${encodeURIComponent(r)}&limit=${limit}`;
  }, [period, room, fixedRoom, limit]);

  async function load() {
    try {
      setLoading(true); setErr(null);
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setErr('讀取排行榜失敗，稍後再試');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white/70 dark:bg-slate-900/40 p-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold">
          排行榜{fixedRoom ? `（${fixedRoom}）` : ''}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* 期間切換 */}
          <div className="inline-flex rounded-lg overflow-hidden border border-slate-300">
            {(['today','week'] as Period[]).map(p => (
              <button key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm ${period===p ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                {p === 'today' ? '本日' : '本週'}
              </button>
            ))}
          </div>

          {/* 房間切換（大廳顯示；房間頁面隱藏） */}
          {showRoomSelector && !fixedRoom && (
            <select value={room} onChange={e => setRoom(e.target.value as Room)}
              className="px-3 py-1 text-sm rounded-lg border border-slate-300 bg-white dark:bg-slate-800">
              <option value="all">全部房間</option>
              <option value="R30">R30</option>
              <option value="R60">R60</option>
              <option value="R90">R90</option>
            </select>
          )}
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">載入中…</div>}
      {err && <div className="text-sm text-rose-500">{err}</div>}

      {!loading && !err && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-2">排名</th>
                <th className="py-2 pr-2">玩家</th>
                <th className="py-2 pr-2 text-right">淨利</th>
                <th className="py-2 pr-2 text-right">押注</th>
                <th className="py-2 pr-2 text-right">領回</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.length ? data.items.map((it, idx) => (
                <tr key={it.userId} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-2">{idx + 1}</td>
                  <td className="py-2 pr-2">{it.name}</td>
                  <td className={`py-2 pr-2 text-right ${it.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {it.profit.toLocaleString()} 元
                  </td>
                  <td className="py-2 pr-2 text-right">{it.wagered.toLocaleString()} 元</td>
                  <td className="py-2 pr-2 text-right">{it.payout.toLocaleString()} 元</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">目前沒有資料</td></tr>
              )}
            </tbody>
          </table>

          {data && (
            <div className="mt-2 text-xs text-slate-400">
              期間：{data.period.label}（{new Date(data.period.startISO).toLocaleString()} ~ {new Date(data.period.endISO).toLocaleString()}）
            </div>
          )}
        </div>
      )}
    </div>
  );
}
