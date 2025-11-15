import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value; // JWT or session
  if (!token) {
    return NextResponse.redirect(new URL("/signIn", req.url));
  }

  // Decode JWT or fetch session (example with JWT payload)
  const payload = JSON.parse(atob(token.split(".")[1]));
  const role = payload.role;

  const path = req.nextUrl.pathname;

  // Protect tutor routes
  if (path.startsWith("/tutor") && role !== "tutor") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Protect student routes
  if (path.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: '/tutor/:path*', // Match /tutor/ and everything after it
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/student/:path*', // Match /student/ and everything after it
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
