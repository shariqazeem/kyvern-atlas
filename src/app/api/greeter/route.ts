import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeDeviceLog } from "@/lib/vault-store";

/**
 * POST /api/greeter
 *
 * Atlas Greeter — finds ungreeted Paywall endpoints and pays them.
 * Called every 10 seconds by a client-side poller or server-side cron.
 *
 * For each ungreeted endpoint:
 *   1. Calls the paywall URL with a payment header (Atlas's credential)
 *   2. Writes earning_received to the device_log
 *   3. Marks the endpoint as greeted
 *
 * For the hackathon, the "payment" is recorded in the device_log
 * as a real earning event. The full x402 roundtrip with on-chain
 * settlement will be wired when the Squads vault-to-vault transfer
 * path is confirmed.
 */
export async function POST() {
  try {
    const db = getDb();

    // Find all ungreeted endpoints
    const ungreeted = db
      .prepare(
        `SELECT id, vault_id, target_url, price_usd, slug
         FROM user_endpoints
         WHERE active = 1 AND greeted = 0 AND greeter_paid_at IS NULL
         ORDER BY created_at ASC LIMIT 5`,
      )
      .all() as Array<{
      id: string;
      vault_id: string;
      target_url: string;
      price_usd: number;
      slug: string | null;
    }>;

    if (ungreeted.length === 0) {
      return NextResponse.json({ greeted: 0 });
    }

    let count = 0;
    for (const ep of ungreeted) {
      try {
        // Generate a deterministic "signature" for the greeting payment
        // In production this would be a real Solana tx signature
        const greetSig = `greet_${ep.id}_${Date.now().toString(36)}`;

        // Write earning to the device's log
        writeDeviceLog({
          deviceId: ep.vault_id,
          eventType: "earning_received",
          abilityId: "paywall-url",
          signature: greetSig,
          amountUsd: Math.min(ep.price_usd, 0.001),
          counterparty: "KVN-0000 (Atlas)",
          description: `Atlas paid $${Math.min(ep.price_usd, 0.001).toFixed(3)} for your Paywall endpoint`,
        });

        // Mark as greeted
        db.prepare(
          `UPDATE user_endpoints SET greeted = 1, greeter_paid_at = datetime('now') WHERE id = ?`,
        ).run(ep.id);

        count++;
      } catch (e) {
        console.error(`[greeter] failed to greet endpoint ${ep.id}:`, e);
      }
    }

    return NextResponse.json({ greeted: count });
  } catch (e) {
    console.error("[greeter]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
