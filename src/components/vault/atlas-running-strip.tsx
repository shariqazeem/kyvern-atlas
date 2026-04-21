"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <AtlasRunningStrip/> — the cinematic bridge.
 *
 * Shown atop the `/vault/new` chooser and success screen. Reminds the
 * user that the live Atlas observatory they JUST saw on the landing
 * page is still running in the background while they configure their
 * own vault. It's a one-liner version of the full observatory — same
 * chrome, same language, same live pill.
 *
 * Why it exists:
 *   Apple's product pages flow. You don't "click into a settings app"
 *   — you stay inside the product. The wizard used to drop you into a
 *   blank-canvas configuration UI that felt disconnected from the
 *   live proof on the landing. This strip carries that proof with
 *   you: "the network is still alive, and you're about to join it."
 *
 * Data:
 *   Polls /api/atlas/status every 10s (slower than the hero — this is
 *   ambient, not the focal point). SSR'd initial state can be passed
 *   via `initialState` for instant first paint.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { fmtInt, fmtUsd } from "@/lib/format";

interface AtlasLite {
  running: boolean;
  firstIgnitionAt: string | null;
  totalSettled: number;
  totalSpentUsd: number;
  totalAttacksBlocked: number;
  totalBlocked: number;
  fundsLostUsd: number;
  network: "devnet" | "mainnet";
}

export function AtlasRunningStrip({
  initialState = null,
}: {
  initialState?: AtlasLite | null;
}) {
  const [state, setState] = useState<AtlasLite | null>(initialState);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/atlas/status");
        if (!r.ok) return;
        const j = (await r.json()) as AtlasLite;
        if (!cancelled) setState(j);
      } catch {
        /* silent — strip is ambient, never crashes the page */
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const attacksBlocked =
    (state?.totalAttacksBlocked ?? 0) + (state?.totalBlocked ?? 0);
  const live = state?.running ?? false;

  return (
    <div
      className="mx-auto max-w-[960px] mt-4 mb-6 rounded-[12px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Traffic-light dots — the observatory signature */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-red)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-yellow)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-green)" }}
          />
        </div>

        {/* URL-ish label */}
        <Link
          href="/atlas"
          className="text-[11px] font-mono-numbers tracking-tight hidden sm:inline transition-colors hover:text-[color:var(--text-secondary)]"
          style={{ color: "var(--text-quaternary)" }}
        >
          kyvernlabs.com/atlas
        </Link>

        {/* Stat strip — the narrative payload */}
        <div
          className="flex-1 flex items-center gap-3 md:gap-4 text-[11px] font-mono-numbers tabular-nums whitespace-nowrap overflow-x-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          <span style={{ color: "var(--text-quaternary)" }}>Atlas is still running</span>
          <span style={{ color: "var(--text-quaternary)" }}>·</span>
          <span>
            <strong style={{ color: "var(--text-primary)" }}>
              {fmtInt(state?.totalSettled ?? 0)}
            </strong>{" "}
            <span style={{ color: "var(--text-quaternary)" }}>txs</span>
          </span>
          <span style={{ color: "var(--text-quaternary)" }}>·</span>
          <span>
            <strong style={{ color: "var(--attack)" }}>
              {fmtInt(attacksBlocked)}
            </strong>{" "}
            <span style={{ color: "var(--text-quaternary)" }}>attacks blocked</span>
          </span>
          <span style={{ color: "var(--text-quaternary)" }}>·</span>
          <span>
            <span style={{ color: "var(--text-quaternary)" }}>lost</span>{" "}
            <strong
              style={{
                color:
                  (state?.fundsLostUsd ?? 0) === 0
                    ? "var(--success-deep)"
                    : "var(--attack)",
              }}
            >
              {fmtUsd(state?.fundsLostUsd ?? 0)}
            </strong>
          </span>
        </div>

        {/* Live pill */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: live ? "var(--success)" : "var(--text-quaternary)",
            }}
            animate={live ? { opacity: [0.5, 1, 0.5] } : undefined}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{
              color: live ? "var(--success-deep)" : "var(--text-tertiary)",
            }}
          >
            {live ? "live" : "offline"}
          </span>
          <Link
            href="/atlas"
            className="ml-2 hidden sm:inline-flex items-center gap-0.5 text-[10.5px] font-semibold transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Open the Atlas observatory"
          >
            watch
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
