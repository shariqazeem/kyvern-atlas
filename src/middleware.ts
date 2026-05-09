/**
 * ════════════════════════════════════════════════════════════════════
 * Next.js middleware — 301 legacy Pulse/x402-analytics routes to /.
 *
 * These routes existed when KyvernLabs was a dual-brand product
 * (Vault + Pulse). For the Frontier submission we're single-brand
 * Kyvern, and every off-thesis surface is a narrative leak judges
 * could stumble onto.
 *
 * 301 (permanent) so search engines and any shared links roll over
 * cleanly to the live product.
 *
 * Scope kept tight — we only match known-stale prefixes, not wildcards,
 * so any future active route never accidentally gets 301'd.
 * ════════════════════════════════════════════════════════════════════
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Exact paths or path prefixes that belong to the pre-pivot surface
 * area. Every one of these redirects to `/` with a 301.
 *
 * If we ever bring a surface back (e.g. a public service registry that
 * actually makes sense for Kyvern's story), drop its prefix from here
 * and the route comes right back to life.
 */
const RETIRED_PREFIXES = [
  "/registry",
  "/reports",
  "/tools",
  "/services",
  "/launch",
  "/provider",
  "/changelog",
];

/**
 * Surfaces moved off the main funnel (per SPEC_TO_WIN §1, §6.7, §6.8).
 * The code still ships under /legacy/* so it can power narrative video
 * shots, but a visitor hitting the old URL gets routed to the archive.
 */
const MOVED_TO_LEGACY: Record<string, string> = {
  "/unbox": "/legacy/unbox",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (MOVED_TO_LEGACY[pathname]) {
    const url = req.nextUrl.clone();
    url.pathname = MOVED_TO_LEGACY[pathname];
    return NextResponse.redirect(url, 301);
  }

  for (const prefix of RETIRED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Match the retired prefixes explicitly. Static assets, API routes,
   * and every active surface pass straight through.
   */
  matcher: [
    "/registry",
    "/registry/:path*",
    "/reports",
    "/reports/:path*",
    "/tools",
    "/tools/:path*",
    "/services",
    "/services/:path*",
    "/launch",
    "/launch/:path*",
    "/provider",
    "/provider/:path*",
    "/changelog",
    "/changelog/:path*",
    "/unbox",
  ],
};
