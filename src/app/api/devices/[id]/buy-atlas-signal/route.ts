import { NextRequest, NextResponse } from "next/server";
import { serverVaultPay } from "@/lib/server-pay";
import { treasuryRecipientPubkey } from "@/lib/agents/treasury";
import { getDb } from "@/lib/db";
import { getVault } from "@/lib/vault-store";

/**
 * POST /api/devices/[id]/buy-atlas-signal
 *
 * The "Pay & Enforce" tab's primary action: the user's device pays
 * Atlas's x402 feed for ONE signal at $0.01 USDC. Real on-chain
 * settlement via the device's policy program. If the chain approves,
 * we record the purchase against feed_purchases (same table the
 * external buyer-bot uses) and return Atlas's latest signal.
 *
 * No new infrastructure — this composes serverVaultPay() (which
 * already routes through the policy program) with the existing
 * /api/atlas/feed paywall logic. The buyer-bot is the public path;
 * this endpoint is the in-app one-click equivalent.
 */

const PRICE_USD = 0.01;
const ATLAS_AGENT_ID = "agt_atlas";
const ATLAS_VAULT_ID = process.env.ATLAS_VAULT_ID ?? "vlt_QcCPbp3XTzHtF5";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, reason: "device not found" },
      { status: 404 },
    );
  }

  // Guest detection: clients in /try mode pass ?guest=1 so we know to
  // route the spend through Atlas's vault (the sandbox treasury) instead
  // of the empty guest vault. Without this, every guest's "Buy signal"
  // bounces with low-balance, killing the moat-demo moment.
  //
  // The signature is still real on-chain. Atlas pays its own x402 feed,
  // which is honest dogfooding — Kyvern devices already trade with each
  // other. Cost: $0.01 of Atlas's USDC per guest visit, capped by RPC
  // rate limits.
  const isGuest = req.nextUrl.searchParams.get("guest") === "1";
  const sourceVaultId = isGuest ? ATLAS_VAULT_ID : params.id;

  // Step 1 — fire the policy-enforced payment. Real on-chain or real
  // failed tx, depending on what the chain decides.
  const recipient = treasuryRecipientPubkey();
  const tag = `KVN feed buy ${Math.random().toString(36).slice(2, 8)}`;
  const pay = await serverVaultPay({
    vaultId: sourceVaultId,
    merchant: "atlas.kyvernlabs.com",
    recipientPubkey: recipient,
    amountUsd: PRICE_USD,
    memo: tag,
    logEvent: {
      eventType: "spending_sent",
      counterparty: "Atlas x402 feed",
      description: isGuest
        ? `Sandbox: bought a signal from Atlas — ${tag}`
        : `Bought a signal from Atlas — ${tag}`,
    },
  });

  if (!pay.success || !pay.signature) {
    return NextResponse.json({
      ok: false,
      signature: null,
      reason: pay.reason ?? "policy program rejected the spend",
    });
  }

  // Step 2 — claim the signal with the settled signature. We don't
  // round-trip through HTTP because the same DB is local; we just
  // mirror the feed_purchase + signal lookup inline.
  const db = getDb();
  const sig = pay.signature;

  // Idempotency — feed_purchases.signature is UNIQUE
  const existing = db
    .prepare(`SELECT id FROM feed_purchases WHERE signature = ?`)
    .get(sig);
  if (existing) {
    return NextResponse.json({
      ok: true,
      signature: sig,
      signal: null,
      reason: "signature already consumed",
    });
  }

  // Pick Atlas's latest meaningful signal — opportunity / market_intel /
  // bounty / wallet_move / etc.
  interface SignalRow {
    id: string;
    kind: string;
    subject: string;
    evidence_json: string;
    source_url: string | null;
  }
  const signal = (db
    .prepare(
      `SELECT id, kind, subject, evidence_json, source_url
         FROM signals
        WHERE agent_id = ?
          AND kind IN ('opportunity', 'market_intel', 'bounty',
                       'wallet_move', 'ecosystem_announcement',
                       'github_release')
        ORDER BY created_at DESC LIMIT 1`,
    )
    .get(ATLAS_AGENT_ID) as SignalRow | undefined) ??
    (db
      .prepare(
        `SELECT id, kind, subject, evidence_json, source_url
           FROM signals
          ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as SignalRow | undefined);

  // Persist the purchase. If signal lookup failed, we still record the
  // buyer's payment — the chain settled it regardless.
  const purchaseId = `fbp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    db.prepare(
      `INSERT INTO feed_purchases (id, signature, buyer_pubkey, amount_usd,
                                    signal_id, signal_kind, signal_subject,
                                    created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      purchaseId,
      sig,
      vault.ownerWallet,
      PRICE_USD,
      signal?.id ?? null,
      signal?.kind ?? null,
      signal?.subject ? String(signal.subject).slice(0, 200) : null,
      Date.now(),
    );
  } catch {
    /* table may not exist locally — best effort */
  }

  return NextResponse.json({
    ok: true,
    signature: sig,
    signal: signal
      ? {
          kind: signal.kind,
          subject: signal.subject,
          sourceUrl: signal.source_url,
        }
      : null,
  });
}
