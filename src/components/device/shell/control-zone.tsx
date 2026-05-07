"use client";

/**
 * ControlZone — Phase 4 (Device Shell Redesign).
 *
 * The right-column stack on desktop, full-width below the canvas on
 * mobile. Five blocks top to bottom:
 *
 *   1. Live Ticker  (hero — every wire pulse paired with a sig)
 *   2. This Week    (drafts · alerts · triggers · AI · cap)
 *   3. Budget       (daily cap gauge · calls · blocked · last tx)
 *   4. Affordances  (+ Bay · ↗ Use · </> Builder)
 *   5. Genesis strip (v0.1 · Roadmap →)
 *
 * Owns its own scroll container — `overflow-y-auto` inside the grid
 * cell so a long ticker never breaks the device-shell viewport fit.
 */

import { TickerCard } from "./control-cards/ticker-card";
import { ThisWeekCard } from "./control-cards/this-week-card";
import { BudgetCard } from "./control-cards/budget-card";
import { AffordancesBlock } from "./control-cards/affordances-block";
import { GenesisStrip } from "../home/genesis-strip";
import type { PanelKind } from "../home/affordance-row";
import type { ActionFeedItem } from "../home/action-feed";

interface PolicySummary {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  callsToday: number;
  blockedToday: number;
  lastSettledTxSignature: string | null;
}

interface WeeklyBenefit {
  drafts: number;
  alerts: number;
  triggersFired: number;
  aiSpendUsd: number;
  dailyCapUsd: number;
}

interface Props {
  actionFeed: ActionFeedItem[];
  network: "devnet" | "mainnet";
  weeklyBenefit: WeeklyBenefit | null;
  policySummary: PolicySummary | null;
  vaultEmpty?: boolean;
  onTopUp?: () => void;
  panel: PanelKind | null;
  onOpenPanel: (kind: PanelKind) => void;
  className?: string;
}

export function ControlZone({
  actionFeed,
  network,
  weeklyBenefit,
  policySummary,
  vaultEmpty,
  onTopUp,
  panel,
  onOpenPanel,
  className,
}: Props) {
  return (
    <aside
      className={`flex flex-col gap-3 sm:gap-4 min-h-0 lg:overflow-y-auto pr-1 ${className ?? ""}`}
    >
      <TickerCard items={actionFeed} network={network} />
      <ThisWeekCard benefit={weeklyBenefit} />
      <BudgetCard
        summary={policySummary}
        network={network}
        vaultEmpty={vaultEmpty}
        onTopUp={onTopUp}
      />
      <AffordancesBlock active={panel} onOpen={onOpenPanel} />
      <GenesisStrip className="pt-1" />
    </aside>
  );
}
