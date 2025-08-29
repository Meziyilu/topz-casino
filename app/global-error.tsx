// app/global-error.tsx
"use client";

export default function GlobalError({ error, reset }: { error: any; reset: () => void }) {
  return (
    <html>
      <body className="min-h-dvh bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="glass p-6 rounded-xl max-w-[90vw]">
          <h2 className="text-xl font-semibold mb-3">全域錯誤</h2>
          <pre className="text-red-300 whitespace-pre-wrap">
            {error?.message ?? String(error)}
          </pre>
          <button className="btn mt-4" onClick={() => reset()}>重試</button>
        </div>
      </body>
    </html>
  );
}
