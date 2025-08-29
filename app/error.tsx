// app/error.tsx
"use client";

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">頁面發生錯誤</h1>
      <pre className="max-w-[90vw] whitespace-pre-wrap text-red-300">
        {error?.message ?? String(error)}
      </pre>
      <button className="btn" onClick={() => reset()}>重新載入</button>
    </div>
  );
}
