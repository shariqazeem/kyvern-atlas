import { NextResponse } from "next/server";
import { readState } from "@/lib/atlas/db";

// The observatory polls every 3s and wants fresh data every time.
// Node.js / Next.js route segment config — force dynamic, no cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/atlas/status
 *
 * Returns the full live state of Atlas for the public observatory UI.
 * Polled every 3-5 seconds from the landing page. Reads from
 * atlas.db — the runner writes, we read. Cheap (single-digit ms).
 *
 * Public on purpose — the whole point of Atlas is that anyone in
 * the world can watch it operate. No auth.
 */
export async function GET() {
  try {
    const state = readState();
    return NextResponse.json(state, {
      headers: {
        // Tiny edge cache. The observatory polls every 3–5 s and the
        // runner writes at most once every 3 min, so a 2 s edge TTL
        // (with 10 s stale-while-revalidate) is invisible to viewers
        // but lets nginx / Cloudflare absorb the load. The browser
        // never caches (must-revalidate) so client-side polling
        // still feels live.
        "Cache-Control":
          "public, max-age=0, s-maxage=2, stale-while-revalidate=10, must-revalidate",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "atlas_offline",
        message:
          e instanceof Error ? e.message : "atlas db not yet initialized",
        running: false,
      },
      { status: 200 },
    );
  }
}
