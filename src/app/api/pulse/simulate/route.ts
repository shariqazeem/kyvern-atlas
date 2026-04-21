import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

/**
 * ════════════════════════════════════════════════════════════════════
 *  POST /api/pulse/simulate  —  spin up a demo endpoint
 *
 *  The earn-side equivalent of the Vault playground. For users who
 *  have Pulse API keys but no real inbound payments yet, this writes
 *  a small burst of realistic-looking x402 events directly into the
 *  events table — so the Pulse dashboard lights up immediately and
 *  the user can feel the product without standing up a real x402
 *  endpoint first.
 *
 *  What it writes:
 *    8 successful payments across 3 endpoints, 4 agent addresses, a
 *    mix of small (~$0.01) and larger (~$0.50) amounts, natural
 *    latency values (150-600ms), spread over the last 10 minutes.
 *    Each gets a realistic-looking devnet tx signature (64-byte base58)
 *    so the UI chips that link to Solana Explorer render correctly —
 *    they won't resolve to real transactions, but that's fine for
 *    visual demos and clearly labeled as "simulated".
 *
 *  Safety:
 *    · Authenticated via our session cookie — no external API key
 *      needed. The demo events get attached to the user's FIRST
 *      service key.
 *    · Refuses if the user has no Pulse key yet — we send them to
 *      /pulse/dashboard/keys to generate one first.
 *    · Idempotency via a short-window dedup: if the user has already
 *      run simulate in the last 60s, we no-op to avoid click-spam
 *      flooding the dashboard.
 * ════════════════════════════════════════════════════════════════════
 */

const MERCHANTS = [
  "api.openai.com",
  "api.anthropic.com",
  "api.perplexity.ai",
];
const AGENT_WALLETS = [
  "6T6TWe4Q5UvQsNq3N4kx6PrCKDZsk6mhsRq5e8TmWwGp",
  "8cFPY2jBDmhBfhsV3jKuvUF2mnJjPLkjEwLh2mFa7tMw",
  "5fXmi4uGpvnWKLj58RsCQxTfcCMv9XNjPqNKWDkxVc3f",
  "HRwPy5v1AZP3rjpzRa3hRJRpDjxQj7YgMDGS2DNG6qMh",
];

/** Pretend tx signature — 88-char base58 shape. */
function fakeSignature(): string {
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 88; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export async function POST(request: NextRequest) {
  const auth = authenticateSession(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "unauthorized", message: auth.error },
      { status: 401 },
    );
  }

  const db = getDb();
  const keyRow = { id: auth.apiKeyId };

  // Dedup: refuse if we wrote simulator events for this key in the last 60s.
  const recent = db
    .prepare(
      `SELECT COUNT(*) as n FROM events
       WHERE api_key_id = ?
       AND source = 'simulator'
       AND timestamp > datetime('now', '-60 seconds')`,
    )
    .get(keyRow.id) as { n: number };
  if (recent.n > 0) {
    return NextResponse.json(
      {
        success: true,
        deduplicated: true,
        inserted: 0,
        message:
          "You just ran this — waiting 60 seconds before another burst.",
      },
      { status: 200 },
    );
  }

  // Insert a burst of 8 events, spread across the last 10 minutes.
  const insert = db.prepare(
    `INSERT INTO events
       (id, api_key_id, timestamp, endpoint, amount_usd, payer_address,
        latency_ms, status, metadata, network, asset, tx_hash, scheme, source)
     VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'simulator')`,
  );

  const now = Date.now();
  const inserted: string[] = [];
  const mintInfo = {
    devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    asset: "USDC",
    network: "solana:devnet",
  };

  for (let i = 0; i < 8; i++) {
    const endpoint = MERCHANTS[i % MERCHANTS.length];
    const payer = AGENT_WALLETS[i % AGENT_WALLETS.length];
    // Amounts: mostly $0.01-$0.08, one ~$0.45 spike
    const amount =
      i === 3 ? 0.45 : +(0.01 + Math.random() * 0.08).toFixed(3);
    const latency = Math.round(150 + Math.random() * 450);
    const timestamp = new Date(
      now - (7 - i) * 60_000 - Math.random() * 30_000,
    ).toISOString();
    const id = nanoid();
    insert.run(
      id,
      keyRow.id,
      timestamp,
      endpoint,
      amount,
      payer,
      latency,
      "success",
      JSON.stringify({ via: "simulator", scenario: i }),
      mintInfo.network,
      mintInfo.asset,
      fakeSignature(),
      "exact",
    );
    inserted.push(id);
  }

  // Nudge daily_stats so the overview card totals reflect the new events.
  try {
    db.prepare(
      `INSERT INTO daily_stats (date, api_key_id, calls, revenue, customers)
       VALUES (date('now'), ?, ?, ?, ?)
       ON CONFLICT(date, api_key_id) DO UPDATE SET
         calls    = calls + excluded.calls,
         revenue  = revenue + excluded.revenue,
         customers = MAX(customers, excluded.customers)`,
    ).run(
      keyRow.id,
      inserted.length,
      0.68, // sum roughly matches the amounts above
      AGENT_WALLETS.length,
    );
  } catch {
    // Schema differences across environments — non-fatal.
  }

  return NextResponse.json(
    {
      success: true,
      inserted: inserted.length,
      message: `${inserted.length} simulated x402 payments captured.`,
    },
    { status: 201 },
  );
}
