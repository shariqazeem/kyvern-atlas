import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVault, writeDeviceLog } from "@/lib/vault-store";

/**
 * POST /api/vault/[id]/bounty
 *
 * Enable Public Drain Bounty on a device.
 * 1. Adds vault to bounty_vaults table (attacker target list)
 * 2. Fires one immediate "welcome attack" (simulated failed tx)
 * 3. Logs attack_blocked to device_log
 * 4. Counter goes 0→1 within 5 seconds
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const vault = getVault(params.id);
    if (!vault) {
      return NextResponse.json({ error: "vault not found" }, { status: 404 });
    }

    const db = getDb();

    // Check if already enabled
    const existing = db
      .prepare(`SELECT vault_id FROM bounty_vaults WHERE vault_id = ?`)
      .get(params.id);

    if (!existing) {
      // Add to bounty targets
      db.prepare(
        `INSERT INTO bounty_vaults (vault_id, attack_count) VALUES (?, 0)`,
      ).run(params.id);
    }

    // Fire welcome attack — a deterministic attack that the policy
    // would block (rogue merchant not in allowlist)
    const welcomeSig = `bounty_welcome_${params.id}_${Date.now().toString(36)}`;

    // Log the welcome attack as blocked
    writeDeviceLog({
      deviceId: params.id,
      eventType: "attack_blocked",
      abilityId: "drain-bounty",
      signature: welcomeSig,
      counterparty: "anonymous",
      description: "Attack blocked: rogue_merchant (evil.drain.xyz) not in allowlist",
      metadata: {
        attackType: "rogue_merchant",
        merchant: "evil.drain.xyz",
        reason: "merchant_not_allowed",
      },
    });

    // Increment attack counter
    db.prepare(
      `UPDATE bounty_vaults SET attack_count = attack_count + 1, welcome_attack_sig = ? WHERE vault_id = ?`,
    ).run(welcomeSig, params.id);

    // Schedule 2 more attacks with slight delays (fire-and-forget)
    // These simulate the attacker probing the device
    setTimeout(() => {
      try {
        const sig2 = `bounty_probe_${params.id}_${Date.now().toString(36)}`;
        writeDeviceLog({
          deviceId: params.id,
          eventType: "attack_blocked",
          abilityId: "drain-bounty",
          signature: sig2,
          counterparty: "anonymous",
          description: "Attack blocked: amount_exceeds_daily ($500.00 requested)",
          metadata: { attackType: "over_cap", amount: 500, reason: "amount_exceeds_daily" },
        });
        db.prepare(`UPDATE bounty_vaults SET attack_count = attack_count + 1 WHERE vault_id = ?`).run(params.id);
      } catch { /* silent */ }
    }, 8000);

    setTimeout(() => {
      try {
        const sig3 = `bounty_probe_${params.id}_${Date.now().toString(36)}`;
        writeDeviceLog({
          deviceId: params.id,
          eventType: "attack_blocked",
          abilityId: "drain-bounty",
          signature: sig3,
          counterparty: "anonymous",
          description: "Attack blocked: prompt_injection detected — memo instructs fund redirect",
          metadata: { attackType: "prompt_injection", reason: "merchant_not_allowed" },
        });
        db.prepare(`UPDATE bounty_vaults SET attack_count = attack_count + 1 WHERE vault_id = ?`).run(params.id);
      } catch { /* silent */ }
    }, 20000);

    return NextResponse.json({
      enabled: true,
      welcomeAttackSig: welcomeSig,
      attackCount: 1,
    });
  } catch (e) {
    console.error("[bounty]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

/**
 * GET /api/vault/[id]/bounty
 * Check bounty status for a device.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const db = getDb();
    const bounty = db
      .prepare(`SELECT * FROM bounty_vaults WHERE vault_id = ?`)
      .get(params.id) as {
      vault_id: string;
      enabled_at: string;
      attack_count: number;
      welcome_attack_sig: string | null;
    } | undefined;

    if (!bounty) {
      return NextResponse.json({ enabled: false, attackCount: 0 });
    }

    return NextResponse.json({
      enabled: true,
      enabledAt: bounty.enabled_at,
      attackCount: bounty.attack_count,
      welcomeAttackSig: bounty.welcome_attack_sig,
    });
  } catch (e) {
    console.error("[bounty]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
