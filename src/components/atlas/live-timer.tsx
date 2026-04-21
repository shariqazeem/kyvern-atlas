"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <LiveTimer/> — the single ticking component of the app.
 *
 * Historically every observatory surface (Atlas hero, /atlas deep page,
 * per-vault strip) had its own `useState(0) + setInterval(1000)` dance
 * just to force a re-render so `fmtUptime(Date.now() - createdAt)` would
 * refresh. That pattern lived in three files, with slightly different
 * cleanup semantics. Every change had to be made three times.
 *
 * This component is the single place where the 1Hz tick lives. Give it
 * an ISO timestamp for `since` (when the thing started) — it renders
 * the live uptime string and re-renders itself exactly once per second.
 *
 * If you want a totally custom format, pass a `render` callback that
 * receives `ms` and returns your own JSX. If not, the default is our
 * shared `fmtUptime` (days/hours/minutes/seconds progressive precision).
 *
 * Accessibility: the container is an <output> with aria-live="off"
 * because a counter that announces itself every second would be
 * hostile to screen readers — sighted users see it update, SR users
 * get the summary label next to it.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { fmtUptime } from "@/lib/format";

export interface LiveTimerProps {
  /** ISO timestamp the thing started at. */
  since: string | null | undefined;
  /** Tick interval in ms. Default 1000. */
  intervalMs?: number;
  /** Optional custom render — receives `ms` since `since`. */
  render?: (ms: number) => React.ReactNode;
  /** Fallback when `since` is missing or invalid. */
  placeholder?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function LiveTimer({
  since,
  intervalMs = 1000,
  render,
  placeholder = "—",
  className,
  style,
}: LiveTimerProps) {
  // A single counter state drives re-renders. We don't actually
  // *use* `tick` — the setter is what matters. Eslint will complain
  // about the unused destructured binding; we opt out with the `_`.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  if (!since) {
    return (
      <span className={className} style={style}>
        {placeholder}
      </span>
    );
  }

  const startedAt = new Date(since).getTime();
  if (Number.isNaN(startedAt)) {
    return (
      <span className={className} style={style}>
        {placeholder}
      </span>
    );
  }
  const ms = Date.now() - startedAt;
  const content = render ? render(ms) : fmtUptime(ms);
  return (
    <output className={className} style={style} aria-live="off">
      {content}
    </output>
  );
}
