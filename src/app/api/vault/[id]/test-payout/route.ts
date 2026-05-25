import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";

/**
 * POST /api/vault/[id]/test-payout
 *
 * Per TRANSFORM_24H §5.6 — fires a real $0.001 USDC transfer from
 * the user's vault to their MY_KAST address. Wizard step 5 calls
 * this so a judge can see a real on-chain payout settle in the
 * user's event feed.
 *
 * Auth: x-owner-wallet must match vault.ownerWallet. Same MVP
 * pattern as /set-kast-destination, /events, /pause.
 *
 * Honest failure modes:
 *   · vault has $0 USDC → server-pay rejects at chain layer with
 *     "no record of prior credit" — surfaced cleanly so the user
 *     gets a "Top up vault first" message, not a stack trace.
 *   · MY_KAST not yet allowlisted → off-chain policy refuses with
 *     merchant_not_allowed; the response contains the reason.
 *
 * Body: optional { amountUsd?: number }, default 0.001.
 */

interface Body {
  ownerWallet?: string;
  amountUsd?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: Body;
  try {
    body = (await req.json().catch(() => ({}))) as Body;
  } catch {
    body = {};
  }

  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault_not_found" },
      { status: 404 },
    );
  }

  // Auth
  const owner =
    req.headers.get("x-owner-wallet")?.trim() ||
    body.ownerWallet?.trim() ||
    "";
  if (!owner || owner !== vault.ownerWallet) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // Pull the configured KAST destination from the vaults row.
  const { getDb } = await import("@/lib/db");
  const row = getDb()
    .prepare(
      `SELECT kast_destination_address AS address
         FROM vaults WHERE id = ?`,
    )
    .get(params.id) as { address: string | null } | undefined;
  const kastAddress = row?.address?.trim() ?? "";
  if (!kastAddress) {
    return NextResponse.json(
      {
        ok: false,
        error: "kast_not_set",
        message:
          "Paste your KAST USDC deposit address + click Allowlist as MY_KAST first.",
      },
      { status: 400 },
    );
  }

  const amountUsd =
    typeof body.amountUsd === "number" && body.amountUsd > 0
      ? body.amountUsd
      : 0.001;

  const result = await serverVaultPay({
    vaultId: params.id,
    merchant: "kast.xyz",
    recipientPubkey: kastAddress,
    amountUsd,
    memo: "MY_KAST test payout",
    trigger: "user",
    logEvent: {
      eventType: "spending_sent",
      counterparty: "kast.xyz",
      description: `MY_KAST test payout · $${amountUsd.toFixed(3)}`,
    },
  });

  if (result.success) {
    return NextResponse.json({
      ok: true,
      signature: result.signature,
      explorerUrl: result.explorerUrl,
      amountUsd,
    });
  }

  // Settled-blocked or chain-failed; surface the real reason.
  return NextResponse.json({
    ok: false,
    error: result.blocked ? "blocked" : "failed",
    reason: result.reason ?? "payout failed",
    signature: result.signature ?? null,
    explorerUrl: result.explorerUrl ?? null,
  });
}
