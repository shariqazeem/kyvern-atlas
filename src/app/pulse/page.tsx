"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 *  /pulse — redirect only.
 *
 *  In the pre-reframe world, /pulse was a whole separate marketing
 *  landing for the earn-side product. That contradicted the unified
 *  "Kyvern is one product with two sides" narrative we now tell
 *  everywhere else, and forced visitors who landed on the main site
 *  to mentally merge two brand pages into one.
 *
 *  After the reframe:
 *    • Authenticated users go straight to /app/services (their live
 *      earn-side dashboard).
 *    • Everyone else goes to /#stack — the "two sides of agent
 *      commerce" section on the canonical marketing page, which
 *      already covers the earn story as one section of the bigger
 *      Kyvern narrative.
 *
 *  This keeps all inbound links to /pulse working while collapsing
 *  the two-product story into one.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function PulseRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/app/services" : "/#stack");
  }, [isAuthenticated, isLoading, router]);

  // Minimal quiet spinner while we resolve auth + navigate.
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{
          borderColor: "var(--border)",
          borderTopColor: "var(--text-primary)",
        }}
      />
    </div>
  );
}
