import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ENC = new TextEncoder();

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/lobby")) {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.redirect(new URL("/", req.url));
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET not set");
      await jwtVerify(token, ENC.encode(secret));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/lobby/:path*"] };
