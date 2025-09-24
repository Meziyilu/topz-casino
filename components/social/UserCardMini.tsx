'use client';
import Link from 'next/link';

export default function UserCardMini({
  user,
}: {
  user: { id: string; displayName: string; avatarUrl?: string | null; publicSlug?: string | null };
}) {
  const href = user.publicSlug ? `/profile/${user.publicSlug}` : `/profile/${user.id}`;
  return (
    <div className="card glass flex gap-3 items-center p-3">
      <img src={user.avatarUrl || '/avatar-default.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
      <div className="flex-1">
        <div className="font-semibold">{user.displayName}</div>
        <Link href={href} className="text-xs text-blue-300">查看個人頁</Link>
      </div>
    </div>
  );
}
