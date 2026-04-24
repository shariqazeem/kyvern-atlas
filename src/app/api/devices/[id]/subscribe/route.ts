import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";

/**
 * POST /api/devices/[id]/subscribe
 *
 * Atlas Intelligence subscription payment.
 * The device pays Atlas $0.001 via real vault.pay() → Squads → Solana.
 * Produces a real signature verifiable on Explorer.
 */

// Atlas's Squads vault address — the recipient of Intelligence payments
const ATLAS_VAULT_ID = "vlt_QcCPbp3XTzHtF5";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const vault = getVault(params.id);
    if (!vault) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    // Get Atlas's vault to find its squads address (recipient)
    const atlasVault = getVault(ATLAS_VAULT_ID);
    if (!atlasVault) {
      return NextResponse.json({ error: "Atlas vault not found" }, { status: 500 });
    }

    const amount = 0.001;

    // Execute real vault.pay() through Squads
    const result = await serverVaultPay({
      vaultId: params.id,
      merchant: "atlas.kyvernlabs.com",
      recipientPubkey: atlasVault.ownerWallet,
      amountUsd: amount,
      memo: "atlas-intelligence subscription",
      logEvent: {
        eventType: "spending_sent",
        abilityId: "atlas-intelligence",
        counterparty: "KVN-0000 (Atlas)",
        description: `Paid Atlas $${amount.toFixed(3)} for intelligence update`,
      },
    });

    if (result.success) {
      return NextResponse.json({
        paid: true,
        amount,
        signature: result.signature,
        explorerUrl: result.explorerUrl,
        counterparty: "KVN-0000 (Atlas)",
      });
    } else {
      return NextResponse.json({
        paid: false,
        reason: result.reason,
        blocked: result.blocked,
      }, { status: result.blocked ? 402 : 500 });
    }
  } catch (e) {
    console.error("[subscribe]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
