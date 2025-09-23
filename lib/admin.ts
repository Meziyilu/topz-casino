// lib/admin.ts
import { cookies } from "next/headers";

export async function requireAdmin() {
  if (process.env.ADMIN_BYPASS === "1") return true;
  const ck = await cookies();
  const flag = ck.get("x-admin")?.value;
  if (flag === "1") return true;
  throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
