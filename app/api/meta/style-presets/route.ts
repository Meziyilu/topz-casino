export const dynamic = "force-dynamic"; export const revalidate = 0;
import { NextResponse } from "next/server";


export async function GET(){
return NextResponse.json({
panelPresets: [
{ code: "GLASS_LIGHT", name: "玻璃·亮", class: "bg-white/60 dark:bg-white/20 border-white/30" },
{ code: "GLASS_DARK", name: "玻璃·暗", class: "bg-neutral-900/60 border-white/10" },
{ code: "NEON_PURPLE", name: "霓虹·紫", class: "bg-black/60 ring-1 ring-purple-500/40 shadow-[0_0_40px]" },
{ code: "AURORA", name: "極光", class: "bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20" },
{ code: "CYBERPUNK", name: "賽博", class: "bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,128,.12),transparent_40%),radial-gradient(circle_at_80%_0,rgba(0,255,255,.12),transparent_40%)]" },
],
headframes: [
{ code: "NONE", name: "無" },
{ code: "GOLD", name: "金框" },
{ code: "NEON", name: "霓虹" },
{ code: "CRYSTAL", name: "水晶" },
{ code: "DRAGON", name: "龍紋" },
],
});
}