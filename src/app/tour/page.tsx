/**
 * ════════════════════════════════════════════════════════════════════
 * /tour — 30-second judge-mode autoplay.
 *
 * A curated cinematic walkthrough of Kyvern. Designed for hackathon
 * judges (and anyone who posts the URL somewhere) to understand the
 * whole product without clicking, scrolling, or reading copy. Six
 * scenes, five seconds each, the entire arc of what we do in 30s.
 *
 * Unlike the landing page, /tour is LINEAR and AUTOPLAYING by default.
 * The viewer sits back; we advance. Pause / prev / next are provided
 * for the rare judge who wants to poke at a scene — but the default
 * is "press play and watch." That's the same UX Apple uses for keynote
 * replays and Vercel uses for their product demos.
 *
 * Reads Atlas state server-side so the first paint shows the real
 * numbers — same SSR trick as the landing page. If atlas.db isn't
 * available (local dev) we fall back to neutral placeholders without
 * breaking the tour.
 * ════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from "next";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";
import { TourClient } from "./tour-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kyvern · Tour · 30 seconds of live Solana autonomy",
  description:
    "The Kyvern tour — 30 seconds, six scenes, one autonomous agent surviving real adversarial pressure on Solana devnet. Watch Atlas run.",
  alternates: { canonical: "https://kyvernlabs.com/tour" },
};

export default function TourPage() {
  const snapshot = readInitialAtlasSnapshot();
  return <TourClient initialState={snapshot?.state ?? null} />;
}
