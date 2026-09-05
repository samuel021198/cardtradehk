import { auth } from "@/lib/auth";

const protectedPrefixes = ["/listings/new", "/messages", "/me", "/admin", "/auctions/new"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const needsAuth =
    protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    /\/listings\/[^/]+\/edit$/.test(pathname);

  if (needsAuth && !req.auth) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/listings/new", "/listings/:id/edit", "/messages/:path*", "/me", "/admin", "/admin/:path*", "/auctions/new"],
};
