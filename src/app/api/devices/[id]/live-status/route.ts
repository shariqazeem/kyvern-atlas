import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getVault } from "@/lib/vault-store";
import { getDb } from "@/lib/db";
import { parseConfig } from "@/lib/agents/config-schema";
import { deriveDeviceState, isPersonalized } from "@/lib/device-state";
import type { AgentTemplate } from "@/lib/agents/types";

/**
 * GET /api/devices/[id]/live-status
 *
 * Single round-trip the home device card needs every 5s. Returns the
 * USDC balance live from on-chain plus everything we need for the
 * status pills, worker avatars, last-action chip, and 24h sparkline.
 *
 * Response (canonical, the card depends on this shape):
 *   {
 *     serial: "KVN-XXXXXXXX",
 *     network: "devnet" | "mainnet",
 *     paused: boolean,
 *     bornAt: ISO string,
 *     usdcBalance: number,         // live on-chain
 *     pnlToday: { earned, spent, net },
 *     pnlSparkline: number[],      // 24 hourly cumulative-net buckets
 *     workersActive: number,
 *     earningPerMinUsd: number,    // rolling 60-min window
 *     lastAction: { worker, emoji, verb, agoSeconds } | null,
 *     workers: [{ id, name, emoji, isThinking, totalThoughts, totalEarnedUsd }]
 *   }
 */

const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface AgentRow {
  id: string;
  name: string;
  emoji: string;
  status: string;
  template: string;
  total_thoughts: number;
  total_earned_usd: number;
  total_spent_usd: number;
  last_thought_at: number | null;
  config_json: string | null;
}

interface ThoughtRow {
  agent_id: string;
  thought: string;
  tool_used: string | null;
  timestamp: number;
}

interface LogRow {
  amount_usd: number | null;
  event_type: string;
  timestamp: string; // SQL datetime string e.g. "2026-04-26 10:31:13"
}

function tsToMs(s: string): number {
  // Mixed-format timestamps in this DB:
  //   · SQLite default datetime: "YYYY-MM-DD HH:MM:SS" (no T, no Z)
  //   · ISO already: "2026-05-01T18:48:31.430Z" (writeDeviceLog uses this)
  // Detect which one we got and normalise to ISO before Date.parse.
  if (!s) return 0;
  const hasT = s.includes("T");
  const normalised = hasT
    ? s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s)
      ? s
      : s + "Z"
    : s.replace(" ", "T") + "Z";
  const ms = Date.parse(normalised);
  return isNaN(ms) ? 0 : ms;
}

function rpcUrlFor(network: string): string {
  if (network === "mainnet") {
    return process.env.SOLANA_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";
  }
  return process.env.SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com";
}

async function fetchVaultBalances(
  vaultPda: string,
  network: string,
): Promise<{ usdc: number; sol: number; usdcAta: string | null }> {
  // Always derive the deterministic ATA address — even when the
  // account doesn't exist on-chain yet OR getParsedTokenAccountsByOwner
  // misses it. The drawer uses this address as the "paste in faucet"
  // target since Circle's devnet faucet handles regular ATAs reliably
  // but not off-curve (PDA) destinations.
  let derivedAta: string | null = null;
  try {
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const mintPk = new PublicKey(
      network === "mainnet" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET,
    );
    const ownerPk = new PublicKey(vaultPda);
    derivedAta = getAssociatedTokenAddressSync(
      mintPk,
      ownerPk,
      true, // vault PDA is off-curve
    ).toBase58();
  } catch {
    /* invalid pubkey shape — leave derivedAta null and fall through */
  }

  try {
    const conn = new Connection(rpcUrlFor(network), "confirmed");
    const owner = new PublicKey(vaultPda);
    const mint = new PublicKey(network === "mainnet" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET);
    const [accounts, lamports] = await Promise.all([
      conn.getParsedTokenAccountsByOwner(owner, { mint }),
      conn.getBalance(owner),
    ]);
    let usdc = 0;
    let usdcAta = derivedAta;
    if (accounts.value.length > 0) {
      const acc = accounts.value[0];
      const ui = acc.account.data.parsed.info.tokenAmount.uiAmount;
      usdc = typeof ui === "number" ? ui : 0;
      // Prefer the on-chain pubkey when present so we never disagree
      // with what Solana itself reports (almost always identical to
      // the derived address).
      usdcAta = acc.pubkey.toBase58();
    }
    return { usdc, sol: lamports / 1e9, usdcAta };
  } catch {
    // RPC error — return the derived ATA anyway so the user can still
    // copy the correct address into the faucet.
    return { usdc: 0, sol: 0, usdcAta: derivedAta };
  }
}

/** Map a URL host or counterparty hint to a recognizable sponsor /
 *  ecosystem name. Live Engine uses these inside worker verbs so the
 *  judge sees real platforms ("Helius bounty", "Squads task") instead
 *  of generic verbs. Returns null when nothing recognizable matches. */
function brandFromHint(hint: string | null | undefined): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  if (h.includes("superteam")) return "Superteam";
  if (h.includes("colosseum")) return "Colosseum";
  if (h.includes("helius")) return "Helius";
  if (h.includes("anza-xyz") || h.includes("agave")) return "Agave";
  if (h.includes("anchor")) return "Anchor";
  if (h.includes("metaplex")) return "Metaplex";
  if (h.includes("solana.com") || h.includes("solana foundation"))
    return "Solana Foundation";
  if (h.includes("jupiter") || h.includes("jup.ag")) return "Jupiter";
  if (h.includes("squads")) return "Squads";
  return null;
}

function verbFor(toolUsed: string | null, hint?: string | null): string {
  const brand = brandFromHint(hint);
  if (!toolUsed) return "thought";
  switch (toolUsed) {
    case "read_dex":
      return "checked DEX price";
    case "read_onchain":
      return "read on-chain data";
    case "watch_url":
      return brand ? `scanned ${brand}` : "scanned a feed";
    case "watch_wallet":
      return "watched a wallet";
    case "watch_wallet_swaps":
      return "scanned for swaps";
    case "message_user":
      return "messaged owner";
    case "expose_paywall":
      return "exposed a paid feed";
    case "subscribe_to_agent":
      return "paid another worker";
    case "post_task":
      return brand ? `posted a ${brand} task` : "posted a task";
    case "claim_task":
      return brand ? `claimed a ${brand} task` : "claimed a task";
    case "complete_task":
      return brand ? `completed a ${brand} task` : "completed a task";
    case "stake_on_finding":
      return "staked on a finding";
    default:
      return toolUsed.replace(/_/g, " ");
  }
}

/** Path C — verb for finding-mode signals. The pill prefers "found X"
 *  over "thought" / "scanned" because it tells the owner what landed,
 *  not what the worker did. */
function verbForSignalKind(kind: string): string {
  switch (kind) {
    case "bounty":
      return "found a bounty";
    case "ecosystem_announcement":
      return "spotted an announcement";
    case "wallet_move":
      return "flagged a whale move";
    case "price_trigger":
      return "triggered on price";
    case "github_release":
      return "found a release";
    case "opportunity":
      return "found an opportunity";
    case "market_intel":
      return "flagged market intel";
    case "observation":
    default:
      return "logged an observation";
  }
}

/** Phase 6 — pull the largest dollar amount mentioned anywhere in the
 *  signal's subject + evidence. Matches "$1,500", "$10k", "$1.5M",
 *  "$500", "$10,000" etc. Used to compute surfacedValueUsd on /app
 *  home — "your workers found $58k worth of opportunities today" is
 *  the discovery-first headline metric. Mirrors the client-side
 *  `parseLargestDollar` in signal-severity.ts so the front-end and
 *  back-end agree on a value. */
function parseLargestDollar(s: string): number {
  let max = 0;
  // $X.YZk / $XM forms first
  const sufRe = /\$\s*([\d,]+(?:\.\d+)?)\s*([kKmM])/g;
  let m: RegExpExecArray | null;
  while ((m = sufRe.exec(s)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(n)) continue;
    const mult = m[2].toLowerCase() === "k" ? 1_000 : 1_000_000;
    max = Math.max(max, n * mult);
  }
  // $X / $X.YZ / $X,YYY forms
  const plainRe = /\$\s*([\d,]+(?:\.\d+)?)\b(?![kKmM])/g;
  while ((m = plainRe.exec(s)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(n)) continue;
    max = Math.max(max, n);
  }
  return max;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json({ error: "device not found" }, { status: 404 });
  }

  const db = getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const minuteAgo = now - 60 * 60 * 1000;

  // Workers on this device
  const agents = db
    .prepare(
      `SELECT id, name, emoji, status, template, total_thoughts, total_earned_usd, total_spent_usd, last_thought_at, config_json
       FROM agents
       WHERE device_id = ? AND status != 'retired'`,
    )
    .all(params.id) as AgentRow[];

  // Per-worker most-recent signal (Live Engine "lastFinding"). Sentinel
  // does most of its work via watch_url → signals; those scans never
  // hit the actionFeed. Without this lookup, a worker that has surfaced
  // 5 opportunities still reads as "Standing by" on its tile because
  // the actionFeed only knows about economic tools. Run one batched
  // SELECT per device, group client-side.
  interface WorkerSignalRow {
    agent_id: string;
    kind: string;
    subject: string;
    source_url: string | null;
    created_at: number;
  }
  const lastSignalByAgent = new Map<string, WorkerSignalRow>();
  if (agents.length > 0) {
    const ids = agents.map((a) => a.id);
    const placeholders = ids.map(() => "?").join(",");
    // Phase 8 (2026-05-08) — restrict per-worker lastFinding to
    // user-facing kinds. The previous query surfaced any recent
    // signal, which meant a release-feed scan ("core v0.12.0") could
    // dominate Sentinel's worker tile and bury the actual valuable
    // last finding (a drafted application). Mirroring USER_FACING_KINDS
    // here keeps tiles focused on user-meaningful output.
    const rows = db
      .prepare(
        `SELECT agent_id, kind, subject, source_url, created_at
           FROM signals
          WHERE agent_id IN (${placeholders})
            AND kind IN ('drafted_application','wallet_alert','trigger_armed','trigger_fired','trigger_blocked')
          ORDER BY created_at DESC
          LIMIT 60`,
      )
      .all(...ids) as WorkerSignalRow[];
    for (const r of rows) {
      if (!lastSignalByAgent.has(r.agent_id)) {
        lastSignalByAgent.set(r.agent_id, r);
      }
    }
  }

  const workersActive = agents.filter((a) => a.status === "alive").length;
  const agentIds = agents.map((a) => a.id);

  // Phase 4 — userOutcome per worker. Counts the worker's Phase 3
  // SignalKind emissions in the last 24h so the chip subtitle reads
  // as user benefit ("2 drafts ready") not internal verb ("watching
  // feeds"). Falls back to "Standing by" when nothing has surfaced.
  const dayAgoMs = now - 24 * 60 * 60 * 1000;
  const outcomeRows = agentIds.length
    ? (db
        .prepare(
          `SELECT agent_id, kind, COUNT(*) AS n, MAX(created_at) AS last_at
             FROM signals
            WHERE agent_id IN (${agentIds.map(() => "?").join(",")})
              AND created_at >= ?
              AND kind IN ('drafted_application','wallet_alert','trigger_armed','trigger_fired','trigger_blocked')
            GROUP BY agent_id, kind`,
        )
        .all(...agentIds, dayAgoMs) as Array<{
        agent_id: string;
        kind: string;
        n: number;
        last_at: number;
      }>)
    : [];
  const outcomeByAgent = new Map<
    string,
    Map<string, { n: number; last_at: number }>
  >();
  for (const r of outcomeRows) {
    let inner = outcomeByAgent.get(r.agent_id);
    if (!inner) {
      inner = new Map();
      outcomeByAgent.set(r.agent_id, inner);
    }
    inner.set(r.kind, { n: r.n, last_at: r.last_at });
  }

  function fmtAgo(ms: number): string {
    const diff = Math.max(0, now - ms) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function userOutcomeFor(template: string, agentId: string): string {
    const inner = outcomeByAgent.get(agentId);
    if (template === "bounty_hunter") {
      const drafts = inner?.get("drafted_application");
      if (drafts && drafts.n > 0) {
        return `${drafts.n} draft${drafts.n === 1 ? "" : "s"} ready`;
      }
      return "Watching for bounties";
    }
    if (template === "whale_tracker") {
      const alerts = inner?.get("wallet_alert");
      if (alerts && alerts.n > 0) {
        return `${alerts.n} alert${alerts.n === 1 ? "" : "s"} · last ${fmtAgo(alerts.last_at)}`;
      }
      return "Watching wallets";
    }
    if (template === "token_pulse") {
      const fired = inner?.get("trigger_fired");
      const armed = inner?.get("trigger_armed");
      if (fired && fired.n > 0) {
        return `${fired.n} fired today · last ${fmtAgo(fired.last_at)}`;
      }
      if (armed && armed.n > 0) {
        return `${armed.n} trigger${armed.n === 1 ? "" : "s"} armed`;
      }
      return "Watching prices";
    }
    return "Standing by";
  }

  const workers = agents.map((a) => {
    const sig = lastSignalByAgent.get(a.id);
    const lastFinding = sig
      ? {
          kind: sig.kind,
          subject: sig.subject,
          brand: brandFromHint(sig.source_url),
          ts: sig.created_at,
        }
      : null;
    const config = parseConfig(a.template as AgentTemplate, a.config_json);
    const personalized = isPersonalized({
      template: a.template,
      config,
    });
    return {
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      template: a.template,
      // "thinking" if alive AND ticked recently — wide enough that the orbit
      // ring is reliably visible in screenshots, narrow enough to mean it
      isThinking:
        a.status === "alive" &&
        a.last_thought_at != null &&
        now - a.last_thought_at < 90_000,
      lastThoughtAt: a.last_thought_at,
      totalThoughts: a.total_thoughts,
      totalEarnedUsd: a.total_earned_usd,
      lastFinding,
      // Phase 6 — TUNE badge when worker is on starter defaults.
      personalized,
      // Phase 4 — chip subtitle reads as user benefit, not internal verb.
      userOutcome: userOutcomeFor(a.template, a.id),
    };
  });

  // Path C — Today's signal counts (pulls from `signals` table for this device)
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();
  const todayCounts = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) AS unread,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) AS read,
        SUM(CASE WHEN status = 'unread' AND source_url IS NOT NULL THEN 1 ELSE 0 END) AS actionable
       FROM signals
       WHERE device_id = ? AND created_at >= ?
         AND kind IN ('drafted_application','wallet_alert','trigger_armed','trigger_fired','trigger_blocked')`,
    )
    .get(params.id, todayMs) as {
    total: number;
    unread: number;
    read: number;
    actionable: number;
  };
  const signalsToday = {
    total: todayCounts?.total ?? 0,
    unread: todayCounts?.unread ?? 0,
    read: todayCounts?.read ?? 0,
    actionable: todayCounts?.actionable ?? 0,
  };

  // Phase 6 — discovery-first headline metrics for /app home.
  // The trio's economic loop is closed-circuit by design (the user-side
  // earnings number is ~zero), but the *discovery* output is real:
  // Sentinel finds Superteam bounties, Wren spots whale moves, Pulse
  // catches band breaches. Lead /app with that, not the closed-loop $.
  interface DiscoveryRow {
    kind: string;
    subject: string;
    evidence_json: string;
    source_url: string | null;
    status: string;
    created_at: number;
  }
  const todaySignalsRaw = db
    .prepare(
      `SELECT kind, subject, evidence_json, source_url, status, created_at
         FROM signals
        WHERE device_id = ? AND created_at >= ?`,
    )
    .all(params.id, todayMs) as DiscoveryRow[];

  let opportunitiesCount = 0;
  let surfacedValueUsd = 0;
  let actionableCount = 0;
  for (const r of todaySignalsRaw) {
    // Phase 1/2 unified kinds for Sentinel + Wren count as "discoveries"
    // alongside the legacy source-specific kinds (bounty, wallet_move).
    const isOpp =
      r.kind === "opportunity" ||
      r.kind === "market_intel" ||
      r.kind === "bounty" ||
      r.kind === "wallet_move" ||
      r.kind === "ecosystem_announcement" ||
      r.kind === "github_release";
    if (!isOpp) continue;
    opportunitiesCount += 1;

    // Sum the largest dollar amount surfaced in subject + evidence.
    let evidenceText = "";
    try {
      const arr = JSON.parse(r.evidence_json) as unknown;
      if (Array.isArray(arr))
        evidenceText = (arr as unknown[]).map((e) => String(e)).join(" · ");
    } catch {
      /* ignore — empty evidence */
    }
    const dollars = parseLargestDollar(`${r.subject} ${evidenceText}`);
    surfacedValueUsd += dollars;

    // "Actionable" today = high-value finds the owner can click into
    // (sourceUrl present + still unread, so not yet acted on).
    if (r.source_url && r.status === "unread") actionableCount += 1;
  }

  // Validated today = completed validation/research tasks settled today
  // where any worker on this device was involved (poster OR claimer).
  // DISTINCT t.id avoids double-counting tasks where both sides live
  // on the same device.
  const validatedRow = db
    .prepare(
      `SELECT COUNT(DISTINCT t.id) AS n
         FROM agent_tasks t
         JOIN agents a ON (a.id = t.posting_agent_id OR a.id = t.claiming_agent_id)
        WHERE a.device_id = ?
          AND t.status = 'completed'
          AND t.completed_at IS NOT NULL
          AND t.completed_at >= ?`,
    )
    .get(params.id, todayMs) as { n: number } | undefined;
  const validatedToday = validatedRow?.n ?? 0;

  const discoveryToday = {
    opportunities: opportunitiesCount,
    surfacedValueUsd: Math.round(surfacedValueUsd),
    validated: validatedToday,
    actionable: actionableCount,
  };

  // Last action across all workers on this device — checks both signals
  // (Path C, finding mode) and thoughts (general worker activity), uses
  // whichever is newer. Signal-based verbs read better in the pill.
  let lastAction: {
    worker: string;
    emoji: string;
    verb: string;
    agoSeconds: number;
  } | null = null;
  if (agents.length > 0) {
    const ids = agents.map((a) => a.id);
    const placeholders = ids.map(() => "?").join(",");

    const lastThought = db
      .prepare(
        `SELECT agent_id, thought, tool_used, timestamp
         FROM agent_thoughts
         WHERE agent_id IN (${placeholders})
         ORDER BY timestamp DESC LIMIT 1`,
      )
      .get(...ids) as ThoughtRow | undefined;

    const lastSignal = db
      .prepare(
        `SELECT agent_id, kind, created_at
         FROM signals
         WHERE agent_id IN (${placeholders})
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(...ids) as { agent_id: string; kind: string; created_at: number } | undefined;

    const thoughtTs = lastThought?.timestamp ?? 0;
    const signalTs = lastSignal?.created_at ?? 0;

    // Prefer signal verb when within 60s of the latest thought (so a
    // signal that landed alongside a tool call wins). Fall back to
    // thought-based verb otherwise.
    if (signalTs > 0 && signalTs >= thoughtTs - 60_000) {
      const a = agents.find((x) => x.id === lastSignal!.agent_id);
      if (a) {
        lastAction = {
          worker: a.name,
          emoji: a.emoji,
          verb: verbForSignalKind(lastSignal!.kind),
          agoSeconds: Math.floor((now - signalTs) / 1000),
        };
      }
    }
    if (!lastAction && lastThought) {
      const a = agents.find((x) => x.id === lastThought.agent_id);
      if (a) {
        lastAction = {
          worker: a.name,
          emoji: a.emoji,
          verb: verbFor(lastThought.tool_used),
          agoSeconds: Math.floor((now - lastThought.timestamp) / 1000),
        };
      }
    }
  }

  // Path C — On-chain action count for today across vault_payments
  // (the policy-program-evaluated rows). Surfaces the "X on-chain today"
  // cell on the TodayStrip and answers "is the policy program getting
  // exercised today?" without a second round-trip.
  const todayPayments = db
    .prepare(
      `SELECT created_at FROM vault_payments WHERE vault_id = ?`,
    )
    .all(params.id) as Array<{ created_at: string }>;
  let onChainToday = 0;
  for (const r of todayPayments) {
    const ms = Date.parse(
      r.created_at.replace(" ", "T") +
        (r.created_at.includes("Z") ? "" : "Z"),
    );
    if (!isNaN(ms) && ms >= todayMs) onChainToday++;
  }

  // Money flow (last 24h + last hour) — pull from device_log
  const allLogs = db
    .prepare(
      `SELECT amount_usd, event_type, timestamp
       FROM device_log
       WHERE device_id = ?
       ORDER BY timestamp DESC
       LIMIT 500`,
    )
    .all(params.id) as LogRow[];

  let earnedToday = 0;
  let spentToday = 0;
  let earnedLastHour = 0;
  const buckets = new Array(24).fill(0);

  for (const r of allLogs) {
    const ms = tsToMs(r.timestamp);
    if (ms < dayAgo) continue;
    const amt = r.amount_usd ?? 0;
    if (amt <= 0) continue;

    const isEarn = r.event_type === "earning_received";
    const isSpend = r.event_type === "spending_sent";

    if (isEarn) {
      earnedToday += amt;
      if (ms >= minuteAgo) earnedLastHour += amt;
    } else if (isSpend) {
      spentToday += amt;
    }

    const hoursAgo = Math.floor((now - ms) / (60 * 60 * 1000));
    const idx = 23 - hoursAgo;
    if (idx >= 0 && idx <= 23) {
      if (isEarn) buckets[idx] += amt;
      else if (isSpend) buckets[idx] -= amt;
    }
  }
  const netToday = earnedToday - spentToday;
  const earningPerMinUsd = earnedLastHour / 60;

  // Cumulative net over the 24 hourly buckets
  let cum = 0;
  const sparkline = buckets.map((b) => (cum += b));

  // ── Phase 5 — Action feed for the device home headline ────────
  // Pulls the last 10 economic events on this device's agents:
  // every post_task / claim_task / complete_task / stake_on_finding /
  // subscribe_to_agent thought, with worker identity, signature, and
  // signatureStatus joined in. The home page's ActionFeed renders
  // each row as a one-liner with an Explorer link when a signature
  // is present.
  interface FeedRow {
    id: string;
    timestamp: number;
    tool_used: string;
    signature: string | null;
    signature_status: string | null;
    amount_usd: number | null;
    counterparty: string | null;
    decision_json: string | null;
    agent_id: string;
    agent_name: string;
    agent_emoji: string;
  }
  // Phase A.2 (KYVERN_FRONTIER_FINAL_SPRINT, 2026-05-08) — live
  // ticker filtered to user-facing tool calls only. The intra-device
  // task economy verbs (post_task / claim_task / complete_task) are
  // retired from the ticker — the user only sees Pulse trigger fires,
  // Pay.sh payments via stake_on_finding, message_user findings, and
  // x402 subscriptions. Internal observations don't belong here.
  const feedRows = db
    .prepare(
      `SELECT t.id, t.timestamp, t.tool_used, t.signature, t.signature_status,
              t.amount_usd, t.counterparty, t.decision_json,
              a.id AS agent_id, a.name AS agent_name, a.emoji AS agent_emoji
         FROM agent_thoughts t
         JOIN agents a ON a.id = t.agent_id
        WHERE a.device_id = ?
          AND t.tool_used IN (
            'pulse_trigger_fire',
            'stake_on_finding',
            'subscribe_to_agent',
            'message_user'
          )
        ORDER BY t.timestamp DESC
        LIMIT 12`,
    )
    .all(params.id) as FeedRow[];

  const actionFeed = feedRows.map((r) => {
    // Pull the result message off decision_json for an idle-tick
    // fallback — when a tool was called but returned ok:false without
    // a signature (e.g. claim_task race), the message is informative.
    let toolMessage: string | null = null;
    try {
      if (r.decision_json) {
        const d = JSON.parse(r.decision_json) as {
          toolResult?: { message?: string };
        };
        if (typeof d.toolResult?.message === "string")
          toolMessage = d.toolResult.message.slice(0, 140);
      }
    } catch {
      /* ignore */
    }
    // Live Engine — sponsor brand resolved from counterparty + message.
    // Surfaces "Squads / Helius / Superteam / Metaplex / etc." inside
    // worker verbs so the rail copy reads as an ecosystem-aware product.
    const brand =
      brandFromHint(r.counterparty) ?? brandFromHint(toolMessage);
    return {
      id: r.id,
      timestamp: r.timestamp,
      tool: r.tool_used,
      worker: { id: r.agent_id, name: r.agent_name, emoji: r.agent_emoji },
      amountUsd: r.amount_usd,
      signature: r.signature,
      signatureStatus: r.signature_status as "success" | "failed" | null,
      counterparty: r.counterparty,
      message: toolMessage,
      brand,
    };
  });

  // policyLastAction — most recent vault_payments row for this vault.
  // Already exposed by /api/devices/[id]/policy-shield, but Phase 5
  // wants it on live-status so the home page hero can show it without
  // a second round-trip.
  interface PaymentRowLite {
    id: string;
    merchant: string;
    amount_usd: number;
    status: string;
    reason: string | null;
    tx_signature: string | null;
    created_at: string;
  }
  const lastPayment = db
    .prepare(
      `SELECT id, merchant, amount_usd, status, reason, tx_signature, created_at
         FROM vault_payments
        WHERE vault_id = ?
        ORDER BY created_at DESC
        LIMIT 1`,
    )
    .get(params.id) as PaymentRowLite | undefined;
  const policyLastAction = lastPayment
    ? {
        id: lastPayment.id,
        merchant: lastPayment.merchant,
        amountUsd: lastPayment.amount_usd,
        approved:
          lastPayment.status === "allowed" || lastPayment.status === "settled",
        reason: lastPayment.reason,
        txSignature: lastPayment.tx_signature,
        createdAt: tsToMs(lastPayment.created_at),
      }
    : null;

  // Live Engine — bottom-rail scoreboard. One scan over today's
  // vault_payments produces every counter the rail needs.
  const todayPaymentsAll = db
    .prepare(
      `SELECT amount_usd, status, tx_signature, created_at
         FROM vault_payments
        WHERE vault_id = ?
        ORDER BY created_at DESC`,
    )
    .all(params.id) as Array<{
    amount_usd: number;
    status: string;
    tx_signature: string | null;
    created_at: string;
  }>;
  let dailySpentUsd = 0;
  let callsToday = 0;
  let blockedToday = 0;
  let lastSettledTxSignature: string | null = null;
  for (const r of todayPaymentsAll) {
    const ms = tsToMs(r.created_at);
    if (ms < todayMs) continue;
    callsToday += 1;
    const approved = r.status === "allowed" || r.status === "settled";
    if (approved) {
      dailySpentUsd += r.amount_usd ?? 0;
      if (!lastSettledTxSignature && r.tx_signature) {
        lastSettledTxSignature = r.tx_signature;
      }
    } else {
      blockedToday += 1;
    }
  }
  const policySummary = {
    dailyLimitUsd: vault.dailyLimitUsd,
    dailySpentUsd,
    callsToday,
    blockedToday,
    lastSettledTxSignature,
  };

  // Phase 4 — "Working for you this week" aggregate. The strip on /app
  // surfaces it under the canvas + ticker so the owner sees the
  // benefit in a single glance: drafts queued, alerts received,
  // triggers fired, AI spend through Pay.sh.
  const weekAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const weekKindCounts = agentIds.length
    ? (db
        .prepare(
          `SELECT kind, COUNT(*) AS n FROM signals
            WHERE device_id = ?
              AND created_at >= ?
              AND kind IN ('drafted_application','wallet_alert','trigger_fired')
            GROUP BY kind`,
        )
        .all(params.id, weekAgoMs) as Array<{ kind: string; n: number }>)
    : [];
  const weekKindMap = new Map<string, number>(
    weekKindCounts.map((r) => [r.kind, r.n]),
  );
  const aiSpendRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
         FROM vault_payments
        WHERE vault_id = ?
          AND status = 'settled'
          AND created_at >= ?
          AND merchant LIKE '%pay.sh%'`,
    )
    .get(params.id, weekAgoMs) as { total: number };
  const weeklyBenefit = {
    drafts: weekKindMap.get("drafted_application") ?? 0,
    alerts: weekKindMap.get("wallet_alert") ?? 0,
    triggersFired: weekKindMap.get("trigger_fired") ?? 0,
    aiSpendUsd: Number(aiSpendRow?.total ?? 0),
    dailyCapUsd: vault.dailyLimitUsd,
  };

  // On-chain balances (legacy vaults without a PDA report zero)
  const balances = vault.vaultPda
    ? await fetchVaultBalances(vault.vaultPda, vault.network)
    : { usdc: 0, sol: 0, usdcAta: null };

  const serial = `KVN-${params.id.replace("vlt_", "").slice(0, 8).toUpperCase()}`;

  // Phase 6 (Frontier Grand Champion) — Device State for the
  // activation flow strip + state-aware whisper line.
  const deviceState = deriveDeviceState(
    { usdcBalance: balances.usdc },
    workers.map((w) => {
      const a = agents.find((row) => row.id === w.id);
      return {
        template: w.template,
        config: parseConfig(w.template as AgentTemplate, a?.config_json ?? null),
        status: a?.status,
        totalThoughts: a?.total_thoughts ?? 0,
      };
    }),
  );

  return NextResponse.json({
    serial,
    network: vault.network,
    paused: !!vault.pausedAt,
    bornAt: vault.createdAt,
    usdcBalance: balances.usdc,
    solBalance: balances.sol,
    vaultPda: vault.vaultPda,
    usdcAta: balances.usdcAta,
    pnlToday: { earned: earnedToday, spent: spentToday, net: netToday },
    pnlSparkline: sparkline,
    workersActive,
    earningPerMinUsd,
    lastAction,
    workers,
    // Path C — today's signal stats for the home card's third stat row
    signalsToday,
    onChainToday,
    // Phase 5 — earnings-first home page payload
    actionFeed,
    policyLastAction,
    // Phase 6 — discovery-first home page metrics (the new headline)
    discoveryToday,
    // Live Engine — bottom-rail scoreboard summary
    policySummary,
    // Phase 4 — "Working for you this week" strip
    weeklyBenefit,
    // Phase 6 (Frontier Grand Champion) — activation-flow state.
    deviceState,
  });
}
