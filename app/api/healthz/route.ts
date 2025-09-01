// app/api/healthz/route.ts
export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
