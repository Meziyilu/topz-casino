// app/casino/baccarat/rooms/[room]/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="p-8 text-white">
      <h2 className="text-xl font-bold mb-2">頁面發生錯誤</h2>
      <p className="opacity-80 text-sm mb-4">{error?.message || "未知錯誤"}</p>
      <button className="border border-white/30 rounded px-3 py-1" onClick={() => reset()}>
        重新整理
      </button>
    </div>
  );
}
