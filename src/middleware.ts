import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProtected = ["/journal", "/memories", "/mood", "/settings"].some(
    (p) => pathname.startsWith(p)
  );

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/journal/:path*", "/memories/:path*", "/mood/:path*", "/settings/:path*"],
};
