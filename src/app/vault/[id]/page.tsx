/**
 * /vault/[id] — legacy per-vault detail page (Pulse-era).
 *
 * Superseded by the /app canvas (P12.25+). Every entry point that
 * previously pointed here (post-deploy success page, vault list,
 * "Open agent dashboard" CTAs) now routes to /app?vault={id}.
 *
 * Server-side redirect so old deep links don't 404 and the user
 * lands on the canonical surface without a flash of the old UI.
 */

import { redirect } from "next/navigation";

export default function LegacyVaultDetail({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/app?vault=${params.id}`);
}
