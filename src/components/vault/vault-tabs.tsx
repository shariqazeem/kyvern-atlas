"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <VaultTabs/> — the dashboard's tab system.
 *
 * Before this, /vault/[id] was a single long scroll:
 *   playground → snippet → budget row → velocity → activity → policy
 *
 * That stack worked for 5 cards but made the dashboard read as an
 * undifferentiated spreadsheet. Each concern now owns its own surface:
 *
 *   Live        — compressed "what's happening right now"
 *   Budget      — the breathing spend ring, timelines, caps
 *   Activity    — the full server-log-tight payments feed
 *   Policy      — allowlist chip garden, velocity bucket, kill switch
 *   Integrate   — SDK snippet + browser playground together
 *
 * Each tab has its own accent color so switching tabs reads as
 * "moving between rooms" rather than "scrolling a form". A Framer
 * `layoutId` underline morphs between tabs so the rail feels alive.
 *
 * Tab selection is stored in the URL (?tab=budget) so:
 *   · Deep-links from docs / tweets land on a specific tab
 *   · Page refreshes preserve state
 *   · Browser back/forward navigates between tabs naturally
 * ════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Code2,
  ShieldAlert,
  Wallet,
  Zap,
} from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import type { Vault, Payment, BudgetSnapshot, VelocitySnapshot } from "./types";
import { LiveTab } from "./tabs/live-tab";
import { BudgetTab } from "./tabs/budget-tab";
import { ActivityTab } from "./tabs/activity-tab";
import { PolicyTab } from "./tabs/policy-tab";
import { IntegrateTab } from "./tabs/integrate-tab";

export type VaultTabKey =
  | "live"
  | "budget"
  | "activity"
  | "policy"
  | "integrate";

interface TabDef {
  key: VaultTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Accent color — drives the active-tab underline + the tab's ambient tint. */
  accent: string;
  /** Hover hint, shown in a tooltip. */
  hint: string;
}

const TABS: TabDef[] = [
  {
    key: "live",
    label: "Live",
    icon: Zap,
    accent: "var(--agent)",
    hint: "What your agent is doing right now.",
  },
  {
    key: "budget",
    label: "Budget",
    icon: Wallet,
    accent: "var(--revenue)",
    hint: "Spend, caps, and the windows they reset in.",
  },
  {
    key: "activity",
    label: "Activity",
    icon: Activity,
    accent: "var(--text-secondary)",
    hint: "Every attempt, allowed or refused.",
  },
  {
    key: "policy",
    label: "Policy",
    icon: ShieldAlert,
    accent: "var(--attack)",
    hint: "The rules your agent can't argue with.",
  },
  {
    key: "integrate",
    label: "Integrate",
    icon: Code2,
    accent: "var(--text-primary)",
    hint: "SDK snippet + live playground.",
  },
];

export interface VaultTabsProps {
  vault: Vault;
  payments: Payment[];
  budget: BudgetSnapshot;
  velocity: VelocitySnapshot;
  /** Called after the user triggers an action in the playground that may
   *  mutate server state, so the parent can refresh the dashboard. */
  onAfterAction?: () => void;
  /** Opens the kill-switch confirmation modal (owned by the parent page). */
  onKillSwitch?: () => void;
}

function isValidTab(s: string | null): s is VaultTabKey {
  return (
    s === "live" ||
    s === "budget" ||
    s === "activity" ||
    s === "policy" ||
    s === "integrate"
  );
}

export function VaultTabs({
  vault,
  payments,
  budget,
  velocity,
  onAfterAction,
  onKillSwitch,
}: VaultTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const initial = isValidTab(urlTab) ? urlTab : "live";

  const [active, setActive] = useState<VaultTabKey>(initial);

  // Keep URL in sync on tab change so shareable links preserve state.
  const switchTo = useCallback(
    (key: VaultTabKey) => {
      setActive(key);
      const params = new URLSearchParams(searchParams.toString());
      if (key === "live") {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      const q = params.toString();
      router.replace(q ? `?${q}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  // Listen for browser back/forward — re-sync state.
  useEffect(() => {
    const next = isValidTab(urlTab) ? urlTab : "live";
    if (next !== active) setActive(next);
    // Intentionally only depend on urlTab; we drive our own `active`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const current = useMemo(
    () => TABS.find((t) => t.key === active) ?? TABS[0],
    [active],
  );

  return (
    <div className="mt-8">
      {/* Tab rail — pill row with a Framer layout-id underline that
          morphs to the active tab. Keeps in horizontal scroll container
          for small viewports. */}
      <div
        className="relative flex items-center gap-1 overflow-x-auto no-scrollbar"
        role="tablist"
        style={{
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.hint}
              onClick={() => switchTo(tab.key)}
              className="relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors"
              style={{
                color: isActive ? tab.accent : "var(--text-tertiary)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="vault-tab-underline"
                  className="absolute left-2 right-2 -bottom-[0.5px] h-[2px] rounded-full"
                  style={{ background: tab.accent }}
                  transition={{ duration: 0.35, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panel — fades/translates between children so switching
          tabs feels like a room swap, not a refresh. Each tab sets its
          own ambient tint via a top rail that matches the active accent. */}
      <div className="relative mt-5">
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: current.accent, opacity: 0.3 }}
          transition={{ duration: 0.3, ease: EASE }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.32, ease: EASE }}
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
          >
            {active === "live" && (
              <LiveTab
                vault={vault}
                payments={payments}
                velocity={velocity}
                budget={budget}
              />
            )}
            {active === "budget" && (
              <BudgetTab vault={vault} budget={budget} velocity={velocity} />
            )}
            {active === "activity" && (
              <ActivityTab vault={vault} payments={payments} />
            )}
            {active === "policy" && (
              <PolicyTab vault={vault} onKillSwitch={onKillSwitch} />
            )}
            {active === "integrate" && (
              <IntegrateTab vault={vault} onAfterAction={onAfterAction} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
