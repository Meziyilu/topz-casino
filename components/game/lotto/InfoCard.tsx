"use client";
export default function InfoCard({ title, value, wide = false }: { title: string; value: string; wide?: boolean }) {
  return (
    <div className={["glass p-4", wide ? "col-span-2" : ""].join(" ")}>
      <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}
