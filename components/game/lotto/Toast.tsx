"use client";
import { useEffect, useState } from "react";
type T = { type: "ok" | "warn" | "err"; text: string };
export default function Toast({ toast, onClose }: { toast: T | null; onClose: () => void }) {
  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => {
    if (!toast) return;
    setOpen(true);
    const t = setTimeout(() => { setOpen(false); onClose(); }, 2000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className={[
      "fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg text-white",
      "shadow-2xl backdrop-blur-sm",
      toast.type === "ok" ? "bg-emerald-600/90" : toast.type === "warn" ? "bg-amber-600/90" : "bg-rose-600/90",
      open ? "animate-pop" : "opacity-0",
    ].join(" ")}>
      {toast.text}
    </div>
  );
}
