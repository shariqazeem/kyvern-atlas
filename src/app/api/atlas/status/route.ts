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
        // No caching — observatory polls every 3s and must see live
        // data. nginx / CDN would otherwise serve stale snapshots.
        "Cache-Control": "no-store, must-revalidate",
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
