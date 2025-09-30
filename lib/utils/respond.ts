export const ok = (data?: any) => Response.json({ ok: true, data });
export const bad = (msg = "Bad Request", code = 400) =>
  new Response(JSON.stringify({ ok: false, error: msg }), { status: code });
export const fail = (msg = "Server Error", code = 500) =>
  new Response(JSON.stringify({ ok: false, error: msg }), { status: code });
