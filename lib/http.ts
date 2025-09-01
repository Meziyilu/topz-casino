// lib/http.ts
import { NextResponse } from "next/server";

export function noStoreJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload as T, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
