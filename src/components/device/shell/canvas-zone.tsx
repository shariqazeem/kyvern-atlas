"use client";

/**
 * CanvasZone — Phase 3 (Device Shell Redesign).
 *
 * The left grid cell on desktop, full-width above the control stack on
 * mobile. Renders:
 *
 *   1. Whisper line at the top.
 *   2. The existing canvas component, in compact mode (no in-canvas
 *      balance text, no Squads attribution — identity strip owns those).
 *
 * Internals of the canvas (workers + wires + halo + ticker logic) are
 * NOT modified. Only the slim-vault flag + the embedded ticker is
 * suppressed (it now renders separately as a control-zone card).
 */

import { WorkerCanvas } from "../home/worker-canvas";
import type { WorkerTileWorker, WorkerTileAction } from "../home/worker-tile";
import type { ActionFeedItem } from "../home/action-feed";

interface Props {
  workers: WorkerTileWorker[];
  lastActionByWorker: Record<string, WorkerTileAction | null>;
  actionFeed: ActionFeedItem[];
  usdcBalance: number;
  network: "devnet" | "mainnet";
  paused: boolean;
  dailyLimitUsd?: number;
  dailySpentUsd?: number;
  className?: string;
}

export function CanvasZone({
  workers,
  lastActionByWorker,
  actionFeed,
  usdcBalance,
  network,
  paused,
  dailyLimitUsd,
  dailySpentUsd,
  className,
}: Props) {
  return (
    <section className={`flex flex-col gap-3 min-h-0 ${className ?? ""}`}>
      {/* Whisper — the device's promise, spoken once per page */}
      <div className="text-center px-4 pt-2 sm:pt-3 flex-shrink-0">
        <p
          className="text-[12.5px] sm:text-[13px] tracking-[-0.005em]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          Three workers. One vault. The chain decides every wire.
        </p>
      </div>

      {/* Canvas — workers + wires + slim vault. Internals untouched. */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="w-full max-w-[640px]">
          <WorkerCanvas
            workers={workers}
            lastActionByWorker={lastActionByWorker}
            actionFeed={actionFeed}
            usdcBalance={usdcBalance}
            network={network}
            paused={paused}
            dailyLimitUsd={dailyLimitUsd}
            dailySpentUsd={dailySpentUsd}
            compact
            hideTicker
            hideWhisper
          />
        </div>
      </div>
    </section>
  );
}
