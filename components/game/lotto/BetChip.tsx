"use client";
type Props = { value: number; active?: boolean; onClick?: () => void; disabled?: boolean; };
export default function BetChip({ value, active, onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-14 h-14 rounded-full grid place-items-center font-extrabold select-none transition-all",
        "bg-gradient-to-br from-primary to-purple-700 text-white border border-white/20 shadow-lg",
        active ? "scale-105 ring-4 ring-primary/50" : "hover:scale-105",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {value}
    </button>
  );
}
