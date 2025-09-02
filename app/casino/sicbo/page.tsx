export default function Page(){ return null; }
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

export async function generateMetadata(){ return { title: "Sic Bo" }; }

export async function GET() {
  return new Response(null, { status: 302, headers: { Location: "/casino/sicbo/r60" }});
}
