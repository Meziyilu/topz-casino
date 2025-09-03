// ==============================
// file: lib/authz.ts
// ==============================
import type { NextRequest } from "next/server";
import { verifyRequest } from "./jwt";


export function verifyJWTFromRequest(req: Request | NextRequest) {
return verifyRequest(req);
}