'use client';
import { useCallback, useEffect, useState } from 'react';

export default function FollowButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    try {
      // 粗略判斷：我的 following 列表是否包含對方（小型產品可直接調 endpoint）
      // 這裡簡化：不額外查，點擊後以成功/失敗切換狀態。
      setFollowing(null);
    } catch {}
  }, []);

  useEffect(() => { check(); }, [check]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        const res = await fetch(`/api/social/follow?followeeId=${userId}`, { method: 'DELETE' });
        if (res.ok) setFollowing(false);
      } else {
        const res = await fetch(`/api/social/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followeeId: userId }),
        });
        if (res.ok) setFollowing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="btn glass" onClick={toggle} disabled={loading}>
      {following ? '已追蹤' : '追蹤'}
    </button>
  );
}
