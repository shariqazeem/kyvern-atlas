"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <FloatingLiveBadge/> — the "Atlas is live right now" FAB.
 *
 * A small, fixed-position capsule in the bottom-right of the viewport
 * (same slot Intercom / Crisp bubbles occupy, but ours is Kyvern-
 * themed and non-modal). Visible on every scroll position of the
 * landing page — a judge who lands, reads a few words, then glances
 * down should IMMEDIATELY see that Atlas is alive and has numbers.
 *
 * Behavior:
 *   · Default state — pill: green pulsing dot + "Atlas · N attacks"
 *   · Hover        — expands to show funds lost + "watch live →"
 *   · Tap / click  — navigates to /atlas
 *   · Hidden on   — /atlas (don't badge yourself on your own page)
 *
 * Polls /api/atlas/leaderboard every 12s for the attack count.
 * Degrades silently if the endpoint is unreachable.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Shield } from "lucide-react";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { fmtInt, fmtUsd } from "@/lib/format";

interface LeaderboardLite {
  weekly?: { total?: number };
  allTime?: { total?: number };
  fundsLostUsd?: number;
}

export function FloatingLiveBadge() {
  const pathname = usePathname();
  const [data, setData] = useState<LeaderboardLite | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/atlas/leaderboard");
        if (!r.ok) return;
        const j = (await r.json()) as LeaderboardLite;
        if (!cancelled) setData(j);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Hide on routes where this would be redundant or in the way.
  if (!mounted) return null;
  const hide =
    pathname?.startsWith("/atlas") ||
    pathname?.startsWith("/tour") ||
    pathname?.startsWith("/embed") ||
    pathname?.startsWith("/vault") ||
    pathname?.startsWith("/app") ||
    pathname?.startsWith("/pulse") ||
    pathname?.startsWith("/login");
  if (hide) return null;

  const weekly = data?.weekly?.total ?? 0;
  const alltime = data?.allTime?.total ?? 0;
  const lost = data?.fundsLostUsd ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 max-w-[calc(100vw-2rem)]"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <Link
        href="/atlas"
        className="block"
        aria-label="Open Atlas observatory"
      >
        <motion.div
          layout
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="rounded-full overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px -16px rgba(0,0,0,0.18)",
          }}
        >
          <div className="flex items-center gap-2 pl-2.5 pr-3 py-2">
            {/* Pulsing live dot */}
            <span className="relative inline-flex items-center justify-center w-4 h-4 shrink-0">
              <motion.span
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{ background: "var(--success)" }}
                animate={{ scale: [1, 2.2, 2.2], opacity: [0.55, 0, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <span
                className="w-2 h-2 rounded-full relative z-10"
                style={{ background: "var(--success)" }}
              />
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--success-deep)" }}
            >
              live
            </span>
            <span
              className="text-[11.5px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Atlas
            </span>
            <span
              className="text-[11.5px] font-mono-numbers tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              ·{" "}
              <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                <NumberScramble value={weekly} format={fmtInt} />
              </strong>{" "}
              attacks / wk
            </span>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  className="px-4 pb-3 pt-1"
                  style={{
                    borderTop: "0.5px solid var(--border-subtle)",
                    marginTop: 2,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 mt-2">
                    <Shield
                      className="w-3 h-3"
                      style={{ color: "var(--agent)" }}
                    />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: "var(--agent)" }}
                    >
                      Defense record
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p
                        className="text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: "var(--text-quaternary)" }}
                      >
                        All-time refused
                      </p>
                      <p
                        className="text-[14px] font-mono-numbers tabular-nums"
                        style={{ color: "var(--text-primary)", fontWeight: 600 }}
                      >
                        {fmtInt(alltime)}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: "var(--text-quaternary)" }}
                      >
                        Funds lost
                      </p>
                      <p
                        className="text-[14px] font-mono-numbers tabular-nums"
                        style={{
                          color:
                            lost === 0
                              ? "var(--success-deep)"
                              : "var(--attack)",
                          fontWeight: 600,
                        }}
                      >
                        {fmtUsd(lost)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="inline-flex items-center gap-1 text-[11px] font-semibold"
                    style={{ color: "var(--agent)" }}
                  >
                    Watch live
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </motion.div>
  );
}
