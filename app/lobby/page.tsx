// app/lobby/page.tsx
import NavBar from "@/components/NavBar";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function RoomCard({ code, name, seconds }: { code: string; name: string; seconds: number }) {
  return (
    <Link href={`/casino/baccarat/${code}`} className="room-card block glass glow-ring sheen">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{name}</h3>
          <span className="text-sm text-white/70">{seconds}s</span>
        </div>
        <p className="mt-2 text-white/80 text-sm">立即入場下注</p>
      </div>
    </Link>
  );
}

export default function LobbyPage() {
  return (
    <main className="min-h-screen bg-casino-bg text-white">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 card glass">
          <div className="animate-pulse text-white/90">
            🎺 跑馬燈：歡迎來到 TOPZCASINO，祝您手氣旺旺！每日 00:00 局序重置，請留意各房倒數～
          </div>
        </div>

        <h2 className="text-lg mb-3 text-white/80">百家樂房間</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <RoomCard code="R30" name="30 秒房" seconds={30} />
          <RoomCard code="R60" name="60 秒房" seconds={60} />
          <RoomCard code="R90" name="90 秒房" seconds={90} />
        </div>
      </div>
    </main>
  );
}
