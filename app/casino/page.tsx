// app/casino/page.tsx
import Link from "next/link";
export default async function CasinoLobby() {
  const rooms = [
    { code: "R30", name: "30秒房" },
    { code: "R60", name: "60秒房" },
    { code: "R90", name: "90秒房" },
  ];
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl mb-4 font-bold">TOPZCASINO 百家樂</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map(r => (
          <Link key={r.code} href={`/casino/${r.code}`} className="rounded-xl p-6 bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20">
            <div className="text-xl font-semibold">{r.name}</div>
            <div className="opacity-70">{r.code}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
