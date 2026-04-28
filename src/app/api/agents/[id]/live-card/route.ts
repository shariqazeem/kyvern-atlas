import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/agents/store";
import { getVault } from "@/lib/vault-store";
import {
  listVisibleBootBeats,
  latestTickStatus,
} from "@/lib/agents/status-updates";

/**
 * GET /api/agents/[id]/live-card
 *
 * Lightweight feed for the LiveWorkerCard on the agent detail page.
 * One small payload, polled every 2-5s. Combines:
 *
 *   · agent identity (emoji + name + template)
 *   · the URL / wallet / token the worker is watching (from
 *     agent.metadata.watchingTarget, persisted at spawn time)
 *   · last-checked timestamp (agent.lastThoughtAt or last tick status)
 *   · current STATE pill — driven by the boot sequence during the
 *     first 60s, then by the latest tick status / thought timestamp
 *   · the vault budget the policy program is enforcing, plus the
 *     program ID for the Solana Explorer link
 *
 * Response:
 *   {
 *     name, emoji, template, templateLabel,
 *     watchingTarget, watchingHref,
 *     lastCheckedAt: number | null,
 *     state: { label, kind: "scanning"|"idle"|"drafting"|"delivered"|"waking" },
 *     budget: { perTxMaxUsd, dailyLimitUsd },
 *     policyProgramId: "PpmZ…MSqc",
 *     phase: "boot" | "live"
 *   }
 */

const POLICY_PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

const TEMPLATE_LABELS: Record<string, string> = {
  bounty_hunter: "Bounty Hunter",
  whale_tracker: "Whale Tracker",
  token_pulse: "Token Pulse",
  ecosystem_watcher: "Ecosystem Watcher",
  github_watcher: "GitHub Watcher",
  scout: "Scout",
  hunter: "Hunter",
  earner: "Earner",
  custom: "Custom",
  atlas: "Atlas",
  analyst: "Analyst",
  greeter: "Greeter",
};

type StateKind = "waking" | "reading" | "scanning" | "drafting" | "delivered" | "idle";

function bootStepToState(stepIndex: number): { label: string; kind: StateKind } {
  // Mirrors the verb-by-verb narration of bootBeats, simplified down
  // to a single STATE pill.
  if (stepIndex <= 0) return { label: "waking", kind: "waking" };
  if (stepIndex === 1) return { label: "reading", kind: "reading" };
  if (stepIndex >= 2 && stepIndex <= 4) return { label: "scanning", kind: "scanning" };
  if (stepIndex === 5) return { label: "drafting", kind: "drafting" };
  return { label: "delivered", kind: "delivered" };
}

function watchingHrefFor(target: string | null): string | null {
  if (!target) return null;
  if (/^https?:\/\//i.test(target)) return target;
  // Solana base58 — link to Explorer
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(target)) {
    return `https://explorer.solana.com/address/${target}?cluster=devnet`;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agent = getAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: "agent not found" }, { status: 404 });
  }
  const vault = getVault(agent.deviceId);

  const phase: "boot" | "live" = agent.totalThoughts === 0 ? "boot" : "live";

  // STATE pill derivation — boot beats during phase=boot, tick status
  // (or idle/last-thought time) during phase=live.
  let state: { label: string; kind: StateKind };
  if (phase === "boot") {
    const beats = listVisibleBootBeats(agent.id);
    const lastVisible = beats.length > 0 ? beats[beats.length - 1].stepIndex : 0;
    state = bootStepToState(lastVisible);
  } else {
    const tick = latestTickStatus(agent.id);
    if (tick && Date.now() - tick.createdAt < 30_000) {
      state = { label: "scanning", kind: "scanning" };
    } else {
      state = { label: "idle", kind: "idle" };
    }
  }

  const meta = (agent.metadata ?? {}) as { watchingTarget?: string };
  const watchingTarget = meta.watchingTarget ?? null;

  return NextResponse.json({
    name: agent.name,
    emoji: agent.emoji,
    template: agent.template,
    templateLabel: TEMPLATE_LABELS[agent.template] ?? agent.template,
    watchingTarget,
    watchingHref: watchingHrefFor(watchingTarget),
    lastCheckedAt: agent.lastThoughtAt,
    state,
    budget: {
      perTxMaxUsd: vault?.perTxMaxUsd ?? null,
      dailyLimitUsd: vault?.dailyLimitUsd ?? null,
    },
    policyProgramId: POLICY_PROGRAM_ID,
    phase,
  });
}
