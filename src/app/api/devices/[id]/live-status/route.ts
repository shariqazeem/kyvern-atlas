import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getVault } from "@/lib/vault-store";
import { getDb } from "@/lib/db";

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
  total_thoughts: number;
  total_earned_usd: number;
  total_spent_usd: number;
  last_thought_at: number | null;
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
  // SQLite returns "YYYY-MM-DD HH:MM:SS" which JS Date can parse if we
  // hint the timezone. Stored values are UTC.
  const ms = Date.parse(s.replace(" ", "T") + "Z");
  return isNaN(ms) ? 0 : ms;
}

function rpcUrlFor(network: string): string {
  if (network === "mainnet") {
    return process.env.SOLANA_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";
  }
  return process.env.SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com";
}

async function fetchUsdcBalance(vaultPda: string, network: string): Promise<number> {
  try {
    const conn = new Connection(rpcUrlFor(network), "confirmed");
    const owner = new PublicKey(vaultPda);
    const mint = new PublicKey(network === "mainnet" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET);
    const accounts = await conn.getParsedTokenAccountsByOwner(owner, { mint });
    if (accounts.value.length === 0) return 0;
    const ui = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return typeof ui === "number" ? ui : 0;
  } catch {
    return 0;
  }
}

function verbFor(toolUsed: string | null): string {
  if (!toolUsed) return "thought";
  switch (toolUsed) {
    case "read_dex":
      return "checked DEX price";
    case "read_onchain":
      return "read on-chain data";
    case "watch_wallet":
      return "watched a wallet";
    case "watch_wallet_swaps":
      return "scanned for Jupiter swaps";
    case "message_user":
      return "messaged owner";
    case "expose_paywall":
      return "exposed a paid feed";
    case "subscribe_to_agent":
      return "paid another worker";
    case "post_task":
      return "posted a task";
    case "claim_task":
      return "claimed a task";
    default:
      return toolUsed.replace(/_/g, " ");
  }
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
      `SELECT id, name, emoji, status, total_thoughts, total_earned_usd, total_spent_usd, last_thought_at
       FROM agents
       WHERE device_id = ? AND status != 'retired'`,
    )
    .all(params.id) as AgentRow[];

  const workersActive = agents.filter((a) => a.status === "alive").length;
  const workers = agents.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    // "thinking" if alive AND ticked recently — wide enough that the orbit
    // ring is reliably visible in screenshots, narrow enough to mean it
    isThinking:
      a.status === "alive" &&
      a.last_thought_at != null &&
      now - a.last_thought_at < 90_000,
    totalThoughts: a.total_thoughts,
    totalEarnedUsd: a.total_earned_usd,
  }));

  // Last action across all workers on this device
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
    if (lastThought) {
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

  // USDC balance — live on-chain (legacy vaults without a PDA report 0)
  const usdcBalance = vault.vaultPda
    ? await fetchUsdcBalance(vault.vaultPda, vault.network)
    : 0;

  const serial = `KVN-${params.id.replace("vlt_", "").slice(0, 8).toUpperCase()}`;

  return NextResponse.json({
    serial,
    network: vault.network,
    paused: !!vault.pausedAt,
    bornAt: vault.createdAt,
    usdcBalance,
    pnlToday: { earned: earnedToday, spent: spentToday, net: netToday },
    pnlSparkline: sparkline,
    workersActive,
    earningPerMinUsd,
    lastAction,
    workers,
  });
}
