/**
 * Device State derivation — Phase 6 (Frontier Grand Champion).
 *
 * Four states drive the Activation Flow on /app:
 *
 *   empty           — vault has < $0.01 USDC AND the device has no
 *                     history yet (never funded, never thought).
 *                     The "fund the vault" copy targets fresh devices,
 *                     not active ones that just dipped low — see the
 *                     2026-05-08 fix below.
 *   funded_default  — every worker is on starter defaults. Findings
 *                     are generic. Reached either by funding a fresh
 *                     vault OR by being a vault with prior history
 *                     (we don't roll back to 'empty' once the user
 *                     has used the device).
 *   partial         — some workers personalized, others still on
 *                     defaults.
 *   active          — every live worker has been personalized at
 *                     least once. Clean device.
 *
 * The derivation is deterministic and runs server-side (in
 * /api/devices/[id]/live-status) so the page just renders the verdict.
 */

import {
  PULSE_DEFAULT_CONFIG,
  SENTINEL_DEFAULT_CONFIG,
  WREN_DEFAULT_CONFIG,
} from "./agents/config-schema";
import type { Agent, AgentTemplate } from "./agents/types";

export type DeviceState =
  | "empty"
  | "funded_default"
  | "partial"
  | "active";

interface VaultLike {
  usdcBalance: number;
}

const TEMPLATE_DEFAULTS: Partial<Record<AgentTemplate, unknown>> = {
  bounty_hunter: SENTINEL_DEFAULT_CONFIG,
  whale_tracker: WREN_DEFAULT_CONFIG,
  token_pulse: PULSE_DEFAULT_CONFIG,
};

/** True iff the agent's saved config differs from the template default —
 *  i.e. the owner has touched it at least once. */
export function isPersonalized(agent: {
  template: string;
  config: unknown;
}): boolean {
  const def = TEMPLATE_DEFAULTS[agent.template as AgentTemplate];
  if (!def) return true; // custom workers count as personalized by definition
  try {
    return JSON.stringify(agent.config) !== JSON.stringify(def);
  } catch {
    return true;
  }
}

export function deriveDeviceState(
  vault: VaultLike,
  agents: Array<{
    template: string;
    config: unknown;
    status?: string;
    /** Phase 6 fix (2026-05-08) — agents with totalThoughts > 0 prove
     *  the device has been used. Once used, never roll back to 'empty'
     *  on a low-balance dip. */
    totalThoughts?: number;
  }>,
): DeviceState {
  const liveAgents = agents.filter((a) => a.status !== "retired");
  const hasHistory = agents.some((a) => (a.totalThoughts ?? 0) > 0);
  if ((vault.usdcBalance ?? 0) < 0.01 && !hasHistory) return "empty";
  if (liveAgents.length === 0) return "funded_default";
  const personalizedCount = liveAgents.filter((a) =>
    isPersonalized(a),
  ).length;
  if (personalizedCount === 0) return "funded_default";
  if (personalizedCount < liveAgents.length) return "partial";
  return "active";
}

/** Server-side helper used by live-status route. Accepts the row shape
 *  store.getAgent returns — including the parsed config blob. */
export function deriveDeviceStateFromAgents(
  vault: VaultLike,
  agents: Agent[],
): DeviceState {
  return deriveDeviceState(
    vault,
    agents.map((a) => ({
      template: a.template,
      config: a.config,
      status: a.status,
      totalThoughts: a.totalThoughts,
    })),
  );
}
