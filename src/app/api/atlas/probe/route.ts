import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { recordAttack } from "@/lib/atlas/db";
import type { AtlasAttack } from "@/lib/atlas/schema";
import { scenarioAt, SCENARIOS } from "@/lib/atlas/attack-catalog";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * ════════════════════════════════════════════════════════════════════
 * POST /api/atlas/probe — "Attack Atlas yourself"
 *
 * Public endpoint that lets a visitor on /atlas fire one of our
 * catalogued adversarial payloads at Atlas's REAL vault via the
 * SAME /api/vault/pay path the scheduled attacker uses. The policy
 * program refuses; we record the attempt with source="public" so
 * the leaderboard can surface it; we return the failed tx sig + the
 * human-readable revert reason so the UI can build a shareable
 * "I tried to exploit Atlas and Solana refused" moment.
 *
 * Safety:
 *   · Rate-limited by IP: 3 per minute, 10 per hour. Enough for a
 *     visitor to try all four scenarios; not enough to DoS us.
 *   · Scenarios target ATTACKER-controlled wallets; Atlas never pays
 *     a real recipient during a probe. Worst-case a request settles
 *     (it won't — policy refuses); the recipient is a throwaway.
 *   · Amounts are bounded by the scenarios themselves (≤ $25).
 *   · The probe uses the server-held KYVERNLABS_AGENT_KEY so no
 *     keys are exposed to the client.
 *
 * Request:  { scenarioIndex: number }
 * Response: {
 *   ok: true,
 *   attack: AtlasAttack,
 *   scenario: { type, label, flavor, payload },
 *   explorerUrl: string | null
 * }
 * ════════════════════════════════════════════════════════════════════
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
const AGENT_KEY = process.env.KYVERNLABS_AGENT_KEY ?? "";

export async function POST(req: Request) {
  // ─── Rate limit ──────────────────────────────────────────────────
  const ip = getClientIP(req);
  const perMin = checkRateLimit(`atlas-probe:min:${ip}`, 3, 60_000);
  if (!perMin.allowed) {
    return rateLimited(
      "Too many probes — Atlas only lets you try 3 attacks per minute.",
      perMin.resetIn,
    );
  }
  const perHour = checkRateLimit(`atlas-probe:hr:${ip}`, 10, 60 * 60_000);
  if (!perHour.allowed) {
    return rateLimited(
      "Hourly probe cap reached — come back in an hour and keep attacking.",
      perHour.resetIn,
    );
  }

  // ─── Parse body ──────────────────────────────────────────────────
  let body: { scenarioIndex?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const idx =
    typeof body.scenarioIndex === "number" ? body.scenarioIndex : -1;
  const scenario = scenarioAt(idx);
  if (!scenario) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_scenario",
        message: `Pick a scenario in [0..${SCENARIOS.length - 1}].`,
      },
      { status: 400 },
    );
  }

  // ─── Configuration check ─────────────────────────────────────────
  if (!AGENT_KEY) {
    // Dev machines without the env var set. Return a structured
    // "try again later" rather than crash.
    return NextResponse.json(
      {
        ok: false,
        error: "atlas_offline",
        message:
          "Atlas isn't reachable from this instance. Try the live site.",
      },
      { status: 503 },
    );
  }

  // ─── Fire the payload ────────────────────────────────────────────
  const payload = scenario.buildPayload();
  let blockedReason = "policy_violation";
  let failedTxSignature: string | null = null;

  try {
    const r = await fetch(`${BASE_URL}/api/vault/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const d = (await r.json()) as {
      payment?: {
        status: string;
        reason: string | null;
        txSignature: string | null;
      };
      error?: string;
      message?: string;
    };

    if (d.payment?.status === "blocked") {
      blockedReason = d.payment.reason ?? "policy_violation";
      failedTxSignature = d.payment.txSignature ?? null;
    } else if (d.payment?.status === "failed") {
      blockedReason = d.payment.reason ?? "chain_refused";
      failedTxSignature = d.payment.txSignature ?? null;
    } else if (d.payment?.status === "settled") {
      // Should never happen — that'd be a real breach.
      blockedReason = "UNEXPECTED_SETTLEMENT";
      failedTxSignature = d.payment.txSignature ?? null;
    } else {
      blockedReason = d.error || d.message || `http_${r.status}`;
    }
  } catch (e) {
    blockedReason = e instanceof Error ? e.message : "network_error";
  }

  // ─── Record + respond ────────────────────────────────────────────
  const attack: AtlasAttack = {
    id: nanoid(),
    attemptedAt: new Date().toISOString(),
    type: scenario.type,
    description: scenario.description,
    blockedReason,
    failedTxSignature,
    source: "public",
  };
  recordAttack(attack);

  const explorerUrl = failedTxSignature
    ? `https://explorer.solana.com/tx/${failedTxSignature}?cluster=devnet`
    : null;

  return NextResponse.json({
    ok: true,
    attack,
    scenario: {
      index: idx,
      type: scenario.type,
      label: scenario.label,
      flavor: scenario.flavor,
      payload,
    },
    explorerUrl,
  });
}

/**
 * GET — listing endpoint the UI calls on mount to render the scenario
 * picker. Exposes only the visitor-safe fields (no private keys,
 * obviously — the `buildPayload` closure stays on the server).
 */
export async function GET() {
  return NextResponse.json(
    {
      scenarios: SCENARIOS.map((s, index) => ({
        index,
        type: s.type,
        label: s.label,
        description: s.description,
        flavor: s.flavor,
      })),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function rateLimited(message: string, resetInMs: number) {
  return NextResponse.json(
    {
      ok: false,
      error: "rate_limited",
      message,
      retryAfterSeconds: Math.ceil(resetInMs / 1000),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(resetInMs / 1000)),
      },
    },
  );
}
