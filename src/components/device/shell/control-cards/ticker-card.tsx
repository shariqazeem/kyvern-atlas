"use client";

/**
 * TickerCard — Phase 4 (Device Shell Redesign).
 *
 * The hero of the control zone. Wraps the existing LiveTicker (reused
 * verbatim from worker-canvas.tsx) inside a card chrome so it sits on
 * its own surface in the device-shell grid. Up to 4 visible rows
 * (canvas-embedded variant showed 6 — control zone has less vertical
 * room).
 */

import { LiveTicker } from "../../home/worker-canvas";
import type { ActionFeedItem } from "../../home/action-feed";

interface Props {
  items: ActionFeedItem[];
  network: "devnet" | "mainnet";
  className?: string;
}

export function TickerCard({ items, network, className }: Props) {
  // Cap at 4 in the control zone — vertical real estate is tight.
  const trimmed = items.slice(0, 4);
  if (trimmed.length === 0) return null;
  return (
    <div className={className}>
      <LiveTicker items={trimmed} network={network} />
    </div>
  );
}
