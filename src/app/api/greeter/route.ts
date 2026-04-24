import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeDeviceLog, getVault } from "@/lib/vault-store";

/**
 * POST /api/greeter
 *
 * Atlas Greeter — pays newly-registered Paywall endpoints via real vault.pay().
 *
 * For each ungreeted endpoint:
 *   1. Calls POST /api/vault/pay using Atlas's real agent key
 *   2. Atlas's policy allows "kyvern-devices" as merchant
 *   3. Squads co-signs the USDC transfer on Solana devnet
 *   4. Real signature returned and logged to device_log
 *
 * Triggered automatically when a Paywall endpoint is registered.
 */
export async function POST() {
  try {
    const db = getDb();
    const agentKey = process.env.KYVERNLABS_AGENT_KEY;
    const baseUrl = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";

    if (!agentKey) {
      return NextResponse.json({ error: "KYVERNLABS_AGENT_KEY not set" }, { status: 500 });
    }

    // Find ungreeted endpoints
    const ungreeted = db
      .prepare(
        `SELECT ue.id, ue.vault_id, ue.target_url, ue.price_usd, ue.slug
         FROM user_endpoints ue
         WHERE ue.active = 1 AND ue.greeter_paid_at IS NULL
         ORDER BY ue.created_at ASC LIMIT 3`,
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
        // Get the user's vault to find their wallet (recipient)
        const userVault = getVault(ep.vault_id);
        if (!userVault) continue;

        const amount = Math.min(ep.price_usd, 0.001);

        // Call the REAL vault.pay() endpoint using Atlas's agent key
        // This goes through: policy check → Squads co-sign → Solana devnet tx
        const payRes = await fetch(`${baseUrl}/api/vault/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${agentKey}`,
          },
          body: JSON.stringify({
            merchant: "kyvern-devices",
            recipientPubkey: userVault.ownerWallet,
            amountUsd: amount,
            memo: `greeter:${ep.slug ?? ep.id}`,
          }),
        });

        const payData = await payRes.json();

        if (payRes.ok && payData.tx?.signature) {
          // Real signature from Solana! Log it.
          writeDeviceLog({
            deviceId: ep.vault_id,
            eventType: "earning_received",
            abilityId: "paywall-url",
            signature: payData.tx.signature,
            amountUsd: amount,
            counterparty: "KVN-0000 (Atlas)",
            description: `Atlas paid $${amount.toFixed(3)} for your Paywall endpoint`,
            metadata: {
              explorerUrl: payData.tx.explorerUrl,
              slug: ep.slug,
            },
          });

          // Mark as greeted
          db.prepare(
            `UPDATE user_endpoints SET greeted = 1, greeter_paid_at = datetime('now') WHERE id = ?`,
          ).run(ep.id);

          count++;
          console.log(
            `[greeter] paid ${ep.vault_id} $${amount} · sig: ${payData.tx.signature}`,
          );
        } else {
          // Payment was blocked or failed — log it anyway so the user sees something
          const reason = payData.reason ?? payData.error ?? "payment failed";
          console.log(
            `[greeter] failed for ${ep.vault_id}: ${reason}`,
          );

          // Still write a log entry so the user knows Atlas tried
          writeDeviceLog({
            deviceId: ep.vault_id,
            eventType: "earning_received",
            abilityId: "paywall-url",
            amountUsd: amount,
            counterparty: "KVN-0000 (Atlas)",
            description: `Atlas attempted payment: ${reason}`,
            metadata: { status: payData.decision ?? "failed", reason },
          });

          // Mark as greeted even on failure (don't retry endlessly)
          db.prepare(
            `UPDATE user_endpoints SET greeted = 1, greeter_paid_at = datetime('now') WHERE id = ?`,
          ).run(ep.id);
          count++;
        }
      } catch (e) {
        console.error(`[greeter] error for endpoint ${ep.id}:`, e);
      }
    }

    return NextResponse.json({ greeted: count });
  } catch (e) {
    console.error("[greeter]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
