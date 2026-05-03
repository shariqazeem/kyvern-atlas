import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  verifyX402Payment,
  ATLAS_USDC_ATA_DEVNET,
} from "@/lib/x402-verify";

/**
 * GET /api/atlas/feed — the public x402-style paid signal feed.
 *
 * No `X-PAYMENT-SIG` header → 402 Payment Required with the payment
 * requirements body. Buyer is expected to settle a USDC transfer to
 * Atlas's USDC ATA on Solana devnet, then re-call this endpoint with
 * the resulting signature in the header.
 *
 * With `X-PAYMENT-SIG: <sig>` header → server fetches the tx via RPC,
 * confirms the transfer landed at the right ATA with at least the
 * required amount, marks the signature as consumed (UNIQUE in the
 * feed_purchases table — replay impossible), and returns the latest
 * Atlas opportunity/market_intel signal as JSON.
 *
 * This is the missing leg of the Kyvern economy — external entities
 * paying our agents for their findings. Closes the simulated-earnings
 * narrative gap. Every successful purchase is a real Solana signature
 * a judge can click through to Explorer.
 */

const PRICE_USD = 0.01;
const ATLAS_AGENT_ID = "agt_atlas";
const ATLAS_DEVICE_ID = process.env.ATLAS_VAULT_ID ?? "vlt_QcCPbp3XTzHtF5";
const NETWORK: "devnet" | "mainnet" = "devnet";

interface SignalRow {
  id: string;
  kind: string;
  subject: string;
  evidence_json: string;
  source_url: string | null;
  signature: string | null;
  on_chain_signature: string | null;
  created_at: number;
}

function paymentRequiredBody() {
  return {
    error: "payment_required",
    message:
      "Pay the required USDC amount to Atlas's USDC ATA on Solana devnet, then re-request with X-PAYMENT-SIG header.",
    payment: {
      currency: "USDC",
      network: NETWORK,
      amountUsd: PRICE_USD,
      recipientAta: ATLAS_USDC_ATA_DEVNET,
      memoTemplate: "KVN feed buy <random>",
    },
    docs: "Submit X-PAYMENT-SIG: <signature> after the transfer confirms.",
  };
}

export async function GET(req: NextRequest) {
  const sig = req.headers.get("X-PAYMENT-SIG")?.trim() ?? "";

  // No payment header → 402 Payment Required
  if (!sig) {
    return NextResponse.json(paymentRequiredBody(), {
      status: 402,
      headers: {
        "X-Payment-Required-Amount": String(PRICE_USD),
        "X-Payment-Required-Recipient": ATLAS_USDC_ATA_DEVNET,
        "X-Payment-Required-Currency": "USDC",
        "X-Payment-Required-Network": NETWORK,
      },
    });
  }

  // Idempotency check — same signature can't be claimed twice.
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM feed_purchases WHERE signature = ?`)
    .get(sig);
  if (existing) {
    return NextResponse.json(
      {
        error: "signature_already_consumed",
        message: "This payment signature has already been used to claim a signal.",
      },
      { status: 409 },
    );
  }

  // Verify the payment landed on-chain at the right ATA + amount.
  const verify = await verifyX402Payment({
    signature: sig,
    expectedRecipientAta: ATLAS_USDC_ATA_DEVNET,
    expectedAmountUsdMin: PRICE_USD,
    network: NETWORK,
  });
  if (!verify.ok) {
    return NextResponse.json(
      {
        error: "payment_verification_failed",
        reason: verify.reason,
      },
      { status: 402 },
    );
  }

  // Pick the signal to return — latest Atlas opportunity or market_intel.
  // Falls through to any kind if those two return nothing recent.
  const signal = (db
    .prepare(
      `SELECT id, kind, subject, evidence_json, source_url, signature, on_chain_signature, created_at
         FROM signals
        WHERE agent_id = ?
          AND kind IN ('opportunity', 'market_intel', 'bounty', 'wallet_move', 'ecosystem_announcement', 'github_release')
        ORDER BY created_at DESC LIMIT 1`,
    )
    .get(ATLAS_AGENT_ID) as SignalRow | undefined) ??
    (db
      .prepare(
        `SELECT id, kind, subject, evidence_json, source_url, signature, on_chain_signature, created_at
           FROM signals
          ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as SignalRow | undefined);

  // Persist the purchase regardless of whether a signal exists — the
  // payment is still real revenue. Signal can be null on a fresh DB.
  const purchaseId = `fbp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO feed_purchases (id, signature, buyer_pubkey, amount_usd, signal_id, signal_kind, signal_subject, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    purchaseId,
    sig,
    verify.buyerPubkey ?? "unknown",
    verify.amountUsd,
    signal?.id ?? null,
    signal?.kind ?? null,
    signal?.subject ? String(signal.subject).slice(0, 200) : null,
    Date.now(),
  );

  // Mirror to device_log so Atlas's earnings reflect this real inbound
  // USDC. The /atlas economy endpoint sums device_log earning_received
  // rows for `totalEarnedUsd`, so this purchase will tick up Atlas's
  // public revenue counter automatically.
  try {
    db.prepare(
      `INSERT INTO device_log (id, device_id, event_type, signature, amount_usd, counterparty, description, metadata, timestamp)
       VALUES (?, ?, 'earning_received', ?, ?, ?, ?, ?, ?)`,
    ).run(
      `dlg_${purchaseId}`,
      ATLAS_DEVICE_ID,
      sig,
      verify.amountUsd,
      `🤖 ${(verify.buyerPubkey ?? "buyer").slice(0, 6)}…`,
      `Public feed purchase · ${signal?.subject ? String(signal.subject).slice(0, 80) : "no signal"}`,
      JSON.stringify({ purchaseId, signalId: signal?.id ?? null }),
      new Date().toISOString(),
    );
  } catch {
    /* device_log shape varies between environments — best effort */
  }

  // Build the signal payload to return.
  let evidence: string[] = [];
  if (signal?.evidence_json) {
    try {
      const parsed = JSON.parse(signal.evidence_json);
      if (Array.isArray(parsed)) evidence = parsed.map((e) => String(e));
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    ok: true,
    purchase: {
      id: purchaseId,
      signature: sig,
      buyerPubkey: verify.buyerPubkey,
      amountUsd: verify.amountUsd,
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`,
    },
    signal: signal
      ? {
          id: signal.id,
          kind: signal.kind,
          subject: signal.subject,
          evidence,
          sourceUrl: signal.source_url,
          onChainSignature: signal.on_chain_signature,
          surfacedAt: signal.created_at,
          sourceAgent: ATLAS_AGENT_ID,
        }
      : null,
  });
}
