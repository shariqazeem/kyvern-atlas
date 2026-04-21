/**
 * ════════════════════════════════════════════════════════════════════
 * /embed/atlas-live — iframe-friendly Atlas status widget.
 *
 * A radically stripped-down observatory designed to drop into another
 * website, a blog post, a conference slide, or a tweet card with one
 * line of HTML:
 *
 *   <iframe src="https://kyvernlabs.com/embed/atlas-live"
 *           width="100%" height="180"
 *           style="border:none;border-radius:14px"></iframe>
 *
 * What it renders:
 *   · Chrome bar with live pill (identity: this is Kyvern's thing)
 *   · Uptime ticker (breathing)
 *   · "Attacks survived this week" big number
 *   · Funds lost → $0.00 (the punchline)
 *   · A single "watch live" link that opens /atlas in a new tab
 *
 * Hardening:
 *   · No layout / no navbar / no footer — standalone.
 *   · No page-level CSS leaks out; all styles are inline or on scoped
 *     CSS vars the embed still inherits from globals.css.
 *   · `x-frame-options: ALLOWALL` handled by Next.js route defaults
 *     (we don't set a DENY anywhere), so it renders in iframes.
 *   · Public read-only — no mutations, no auth.
 * ════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from "next";
import { readInitialAtlasSnapshot } from "@/lib/atlas/ssr";
import { AtlasLiveEmbed } from "./embed-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Intentionally spare — this is meant to be an embedded asset, not
  // a route anyone links to directly for SEO.
  title: "Atlas · live",
  robots: { index: false, follow: false },
};

export default function AtlasLiveEmbedPage() {
  const snapshot = readInitialAtlasSnapshot();
  return <AtlasLiveEmbed initialState={snapshot?.state ?? null} />;
}
