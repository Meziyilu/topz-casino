// app/lobby/page.tsx
import NavBar from "@/components/NavBar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LobbyPage() {
  return (
    <main className="min-h-screen bg-casino-bg text-white">
      <NavBar />
      {/* 這裡放你的大廳內容 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ...你的房間卡片/跑馬燈... */}
      </div>
    </main>
  );
}
