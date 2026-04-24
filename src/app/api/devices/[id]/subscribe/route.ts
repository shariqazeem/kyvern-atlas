import { NextRequest, NextResponse } from "next/server";
import { getVault, writeDeviceLog } from "@/lib/vault-store";

/**
 * POST /api/devices/[id]/subscribe
 *
 * Atlas Intelligence subscription payment.
 * The device pays Atlas $0.001 for each update.
 * Writes spending_sent to device_log with a signature.
 *
 * For the hackathon, this is a logged payment event.
 * The real vault.pay() path through the policy engine will be
 * wired when vault-to-vault transfer is confirmed on devnet.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const vault = getVault(params.id);
    if (!vault) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    const paymentSig = `intel_${params.id}_${Date.now().toString(36)}`;
    const amount = 0.001;

    // Log the spending event
    writeDeviceLog({
      deviceId: params.id,
      eventType: "spending_sent",
      abilityId: "atlas-intelligence",
      signature: paymentSig,
      amountUsd: amount,
      counterparty: "KVN-0000 (Atlas)",
      description: `Paid Atlas $${amount.toFixed(3)} for intelligence update`,
    });

    return NextResponse.json({
      paid: true,
      amount,
      signature: paymentSig,
      counterparty: "KVN-0000 (Atlas)",
    });
  } catch (e) {
    console.error("[subscribe]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
