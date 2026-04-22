/**
 * ════════════════════════════════════════════════════════════════════
 * /welcome — cinematic onboarding bridge.
 *
 * First-time /app visitors land here for ~12 seconds of scene-paced
 * orientation before being dropped into their workspace. Three scenes:
 *
 *   1. "You just joined the network."    — cold open, ambient grid
 *   2. "Here's what's running around you" — live Atlas observatory
 *   3. "This is your workspace"           — peek at /app layout
 *
 * Returning users never see this again — the client component sets a
 * localStorage flag on mount so /app's own redirect check stops
 * firing for them.
 *
 * Read Atlas state server-side so the live numbers render in the
 * initial HTML (fast first paint, good on social unfurls).
 * ════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from "next";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";
import { WelcomeClient } from "./welcome-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome to Kyvern",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  const snapshot = readInitialAtlasSnapshot();
  return <WelcomeClient initialState={snapshot?.state ?? null} />;
}
