/**
 * ════════════════════════════════════════════════════════════════════
 * Atlas — the first autonomous agent on Kyvern.
 *
 * Atlas is a standalone Node process that runs 24/7 under PM2. It is
 * ALSO a Kyvern customer — it deploys a vault, funds it with USDC,
 * and then every ~N minutes it:
 *
 *   1. OBSERVES its context — time of day, last decision, recent events
 *   2. DECIDES what to do next (which API to call / what to publish)
 *      with human-readable reasoning — the "thinking out loud" that
 *      makes Atlas feel alive instead of mechanical
 *   3. ACTS via vault.pay() — real on-chain tx through Kyvern's policy
 *      program, real USDC moved on Solana devnet
 *   4. EARNS when users pay to read its output via x402
 *   5. LOGS the decision + outcome for public observability
 *
 * Periodically, Atlas is also attacked — prompt-injection, over-cap
 * requests, merchant-exfiltration attempts — so it can demonstrate
 * what Kyvern refuses.
 *
 * This file defines the types every layer of Atlas shares.
 * ════════════════════════════════════════════════════════════════════
 */

/** A single decision Atlas made in one cycle. */
export interface AtlasDecision {
  /** Primary key — nanoid. */
  id: string;
  /** ISO timestamp of when the decision was MADE (not when it settled). */
  decidedAt: string;
  /**
   * Human-readable reasoning for this decision. Shown to the public.
   * This is the "thinking out loud" that makes Atlas feel alive. Examples:
   *   "Buying fresh news from Perplexity — last forecast is 4h stale."
   *   "Publishing today's forecast to Arweave for permanent record."
   *   "Idling 30m — next scheduled data refresh not yet due."
   */
  reasoning: string;
  /** Machine-readable action label for aggregation / filtering. */
  action:
    | "buy_data"
    | "reason"
    | "publish"
    | "self_report"
    | "idle";
  /** The merchant Atlas intended to pay. null for idle. */
  merchant: string | null;
  /** USD amount Atlas tried to spend. 0 for idle. */
  amountUsd: number;
  /** What actually happened. */
  outcome: "settled" | "blocked" | "failed" | "idle";
  /** If settled or blocked, the Solana tx signature. null otherwise. */
  txSignature: string | null;
  /** If the policy refused, the reason string from Kyvern. */
  blockedReason: string | null;
  /** Latency from decide → outcome in ms. */
  latencyMs: number;
  /** Cycle number this decision belonged to (monotonic, starts at 1). */
  cycle: number;
}

/** A simulated adversarial attack — useful for demonstrating Kyvern in action. */
export interface AtlasAttack {
  id: string;
  attemptedAt: string;
  /** Short label: "prompt-injection", "over-cap", "rogue-merchant". */
  type: "prompt_injection" | "over_cap" | "rogue_merchant" | "missing_memo";
  /** One sentence describing what was tried. */
  description: string;
  /** One sentence for the "why it was refused" — maps to program error. */
  blockedReason: string;
  /**
   * If the attack reached Kyvern and was refused on-chain, the tx sig
   * of the failed Solana transaction. Some attacks (over-cap) are
   * refused at the policy layer before tx sign — those have null sig.
   */
  failedTxSignature: string | null;
  /**
   * Where this attack came from:
   *   · "scheduled" — the PM2 attacker process, firing on its ~22 min cadence.
   *   · "public" — a real visitor clicked "Attack Atlas yourself" on /atlas.
   * Defaults to "scheduled" for attacks written before this column existed.
   */
  source?: "scheduled" | "public";
}

/** One full cycle — observe → decide → act → log. */
export interface AtlasCycle {
  id: number;
  startedAt: string;
  endedAt: string | null;
  decisionId: string | null;
  /**
   * Intended next cycle ETA (ISO timestamp) so the UI can render
   * "Next decision in: Xm Ys" live, without the runner having to wake.
   */
  nextCycleAt: string | null;
}

/** Top-level state blob — observability endpoint's primary shape. */
export interface AtlasState {
  /** Whether the runner is online right now. */
  running: boolean;
  /** Total cycles Atlas has executed since first ignition. */
  totalCycles: number;
  /** First-ever cycle timestamp. null if never ignited. */
  firstIgnitionAt: string | null;
  /** Now-ish in ms since first ignition. Computed live. */
  uptimeMs: number;

  /** Total settled payments Atlas has made via Kyvern. */
  totalSettled: number;
  /** Total USD spent. */
  totalSpentUsd: number;
  /** Total USD earned (from x402 inbound to Atlas's service). */
  totalEarnedUsd: number;

  /** Total Kyvern policy refusals (blocked on-chain or at policy layer). */
  totalBlocked: number;
  /** Total attack simulations that Kyvern caught. */
  totalAttacksBlocked: number;
  /** USD actually lost to exploits / leaks. Always 0 if Kyvern is doing its job. */
  fundsLostUsd: number;

  /** Most recent decision Atlas made, whatever its outcome. */
  lastDecision: AtlasDecision | null;
  /** Most recent attack attempt — the "last blocked" card on the observatory. */
  lastAttack: AtlasAttack | null;
  /** Next scheduled decision's ISO timestamp. */
  nextCycleAt: string | null;
  /**
   * Next scheduled attack's ISO timestamp. The attacker writes this
   * when it schedules its next probe so the UI can show a
   * "defending · next probe in 4:32" countdown band. null if the
   * attacker hasn't armed a next cycle yet (cold start or crash).
   */
  nextAttackAt: string | null;

  /**
   * Live policy window — how close Atlas is to its own spending caps
   * in the last 24 hours. Drives the "policy window healthy /
   * nearing limit / exhausted" narrative on the observatory.
   */
  policy: {
    /** Configured daily spend cap in USD (from ATLAS_DAILY_CAP_USD env). */
    dailyCapUsd: number;
    /** Sum of `settled` amounts in the rolling 24h window. */
    spentTodayUsd: number;
    /** 0–1 ratio. `> 1` means we're over cap — should never happen because Kyvern refuses. */
    spendUtilization: number;
    /** Convenience flag — `>= 0.80`. Matches UI "near cap" banner. */
    nearCap: boolean;
    /** `>= 1.0` — the window is fully consumed. */
    exhausted: boolean;
    /** ISO of when the oldest counted payment rolls off (24h boundary). */
    windowResetsAt: string | null;
  };

  /** Atlas's own vault id (for deep-linking to its dashboard). */
  vaultId: string | null;
  /** Atlas's network — always "devnet" for now. */
  network: "devnet" | "mainnet";
}
