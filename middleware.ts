import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Only protect routes under /(admin)
  // In Next.js, route groups like (admin) don't appear in the URL,
  // so we match based on the actual URL paths that the (admin) group serves.
  // The (admin) group contains /shares and potentially other admin routes.
  const isAdminRoute =
    pathname.startsWith("/shares") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/dashboard");

  if (!isAdminRoute) {
    // Allow all other routes through (e.g. /s/* public share routes, /, etc.)
    return NextResponse.next();
  }

  // Check authentication
  if (!req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  // Check admin role
  if (!req.auth.user?.isAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - s/* is included in the matcher but allowed through in the middleware logic above
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
