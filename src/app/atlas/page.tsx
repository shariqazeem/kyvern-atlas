import type { Metadata } from "next";
import AtlasClient from "./atlas-client";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";

/**
 * /atlas — public deep page. Server component so we can SSR the
 * initial snapshot (counters, last decision, recent feed) straight
 * from atlas.db. This eliminates the "awaiting ignition · — — —"
 * flicker that used to show on every first paint / every social
 * unfurl.
 *
 * The interactive layer (filters, polling, live ticker) lives in
 * atlas-client.tsx. We pass it the SSR'd snapshot as props; it
 * hydrates with real values already on screen and picks up live
 * updates from there.
 */

export const dynamic = "force-dynamic"; // Atlas state changes every cycle

export const metadata: Metadata = {
  title: "Atlas — live on Solana · Kyvern",
  description:
    "Atlas is the first autonomous agent on Kyvern. It operates real USDC on Solana devnet — pays for its own data, publishes forecasts, gets attacked, and survives. Watch every decision live.",
  alternates: { canonical: "https://kyvernlabs.com/atlas" },
};

export default function AtlasPage() {
  const snapshot = readInitialAtlasSnapshot();
  return (
    <AtlasClient
      initialState={snapshot.state}
      initialFeed={snapshot.recentFeed ?? []}
      initialAttacks={snapshot.recentAttacks ?? []}
      initialPnl24h={snapshot.pnl24h ?? new Array(24).fill(0)}
      initialFindings={snapshot.recentFindings ?? []}
      initialFindingsThisWeek={snapshot.findingsThisWeek ?? 0}
    />
  );
}
