"use client";

/**
 * The actual embed widget — client component so we can poll the
 * status + leaderboard endpoints for live numbers. Parent page
 * passes an SSR'd initialState so first paint ships real data even
 * in a slow-network iframe context (Twitter card, etc.).
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { LiveTimer } from "@/components/atlas/live-timer";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { fmtInt, fmtUsd } from "@/lib/format";

interface AtlasLite {
  running: boolean;
  firstIgnitionAt: string | null;
  totalSettled: number;
  fundsLostUsd: number;
}

interface LeaderboardLite {
  weekly?: { total?: number };
}

export function AtlasLiveEmbed({
  initialState,
}: {
  initialState: AtlasLite | null;
}) {
  const [state, setState] = useState<AtlasLite | null>(initialState);
  const [weekly, setWeekly] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, l] = await Promise.all([
          fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/atlas/leaderboard").then((r) =>
            r.ok ? r.json() : null,
          ),
        ]);
        if (cancelled) return;
        if (s) setState(s as AtlasLite);
        if (l) setWeekly((l as LeaderboardLite).weekly?.total ?? 0);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const live = state?.running ?? false;

  return (
    <div
      className="w-full h-full min-h-[180px] font-[Inter,system-ui,sans-serif]"
      style={{
        background: "var(--surface, #ffffff)",
        color: "var(--text-primary, #000000)",
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          border: "0.5px solid var(--border-subtle, #f0f0f0)",
          borderRadius: 14,
          background: "var(--surface, #ffffff)",
        }}
      >
        {/* Chrome bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "0.5px solid var(--border-subtle, #f0f0f0)" }}
        >
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--chrome-red, #F87171)" }}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--chrome-yellow, #FBBF24)" }}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--chrome-green, #4ADE80)" }}
            />
          </div>
          <span
            className="text-[10.5px] font-mono-numbers"
            style={{ color: "var(--text-quaternary, #C7C7CC)" }}
          >
            kyvernlabs.com/atlas
          </span>
          <div className="flex items-center gap-1">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: live
                  ? "var(--success, #22C55E)"
                  : "var(--text-quaternary, #C7C7CC)",
              }}
              animate={live ? { opacity: [0.5, 1, 0.5] } : undefined}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color: live
                  ? "var(--success-deep, #15803D)"
                  : "var(--text-tertiary, #AEAEB2)",
              }}
            >
              {live ? "live" : "offline"}
            </span>
          </div>
        </div>

        {/* Body — three-column compact */}
        <div
          className="grid grid-cols-3 gap-4 px-5 py-4"
          style={{ background: "var(--surface, #ffffff)" }}
        >
          <div>
            <p
              className="text-[9.5px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--text-quaternary, #C7C7CC)" }}
            >
              Uptime
            </p>
            {state?.firstIgnitionAt ? (
              <LiveTimer
                since={state.firstIgnitionAt}
                className="mt-0.5 block text-[18px] font-mono-numbers tabular-nums tracking-tight leading-none"
                style={{
                  color: "var(--text-primary, #000)",
                  fontWeight: 500,
                }}
              />
            ) : (
              <p
                className="mt-0.5 text-[18px] font-mono-numbers tabular-nums tracking-tight leading-none"
                style={{
                  color: "var(--text-tertiary, #AEAEB2)",
                  fontWeight: 500,
                }}
              >
                just now
              </p>
            )}
          </div>

          <div>
            <p
              className="text-[9.5px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--text-quaternary, #C7C7CC)" }}
            >
              Attacks / wk
            </p>
            <p
              className="mt-0.5 text-[18px] font-mono-numbers tabular-nums tracking-tight leading-none"
              style={{
                color: "var(--attack, #B91C1C)",
                fontWeight: 500,
              }}
            >
              <NumberScramble value={weekly} format={fmtInt} />
            </p>
          </div>

          <div>
            <p
              className="text-[9.5px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--text-quaternary, #C7C7CC)" }}
            >
              Lost
            </p>
            <p
              className="mt-0.5 text-[18px] font-mono-numbers tabular-nums tracking-tight leading-none"
              style={{
                color: "var(--success-deep, #15803D)",
                fontWeight: 500,
              }}
            >
              {fmtUsd(state?.fundsLostUsd ?? 0)}
            </p>
          </div>
        </div>

        {/* Footer link */}
        <a
          href="https://kyvernlabs.com/atlas"
          target="_top"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold transition-colors"
          style={{
            borderTop: "0.5px solid var(--border-subtle, #f0f0f0)",
            color: "var(--text-secondary, #6E6E73)",
            background: "var(--surface-2, #F5F5F7)",
          }}
        >
          <span>
            Atlas survived {fmtInt(weekly)} attacks this week
          </span>
          <span className="inline-flex items-center gap-1">
            watch live
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </a>
      </div>
    </div>
  );
}
