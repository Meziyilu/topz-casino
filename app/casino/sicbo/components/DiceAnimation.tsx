// app/casino/sicbo/components/DiceAnimation.tsx
"use client";
export default function DiceAnimation({dice}:{dice:[number,number,number]|null}){
  return (
    <div className="glass p-3 flex gap-3 justify-center items-center rounded-lg">
      {[0,1,2].map(i=>{
        const v = dice ? dice[i] : 1;
        return <div key={i} className={`w-12 h-12 glass flex items-center justify-center text-xl font-bold ${dice?"":"dice-shake"}`}>{v}</div>;
      })}
    </div>
  );
}
