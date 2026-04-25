import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAtlasDb } from "@/lib/atlas/db";

/**
 * GET /api/log/global
 *
 * Global firehose — last N public events across ALL devices.
 * Powers the landing page ticker, activity tab global view,
 * and the "the system is breathing" feeling.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10),
      200,
    );

    const db = getDb();

    // Get events from device_log across all devices
    const events = db
      .prepare(
        `SELECT dl.*, v.name AS device_name, v.emoji AS device_emoji
         FROM device_log dl
         LEFT JOIN vaults v ON v.id = dl.device_id
         ORDER BY dl.timestamp DESC
         LIMIT ?`,
      )
      .all(limit) as Array<{
      id: string;
      device_id: string;
      timestamp: string;
      event_type: string;
      ability_id: string | null;
      signature: string | null;
      amount_usd: number | null;
      counterparty: string | null;
      description: string;
      metadata_json: string | null;
      device_name: string | null;
      device_emoji: string | null;
    }>;

    // Atlas data lives in a separate database (atlas.db)
    let adb: ReturnType<typeof getAtlasDb> | null = null;
    try { adb = getAtlasDb(); } catch { /* atlas.db might not exist locally */ }

    // Also get Atlas events from atlas_decisions + atlas_attacks for the firehose
    const atlasDecisions = adb ? adb
      .prepare(
        `SELECT id, decided_at AS timestamp, reasoning AS description,
                merchant, amount_usd, outcome, tx_signature AS signature
         FROM atlas_decisions
         ORDER BY decided_at DESC LIMIT ?`,
      )
      .all(Math.min(limit, 20)) as Array<{
      id: string;
      timestamp: string;
      description: string;
      merchant: string | null;
      amount_usd: number;
      outcome: string;
      signature: string | null;
    }> : [];

    const atlasAttacks = adb ? adb
      .prepare(
        `SELECT id, attempted_at AS timestamp, description, type,
                blocked_reason, failed_tx_signature AS signature
         FROM atlas_attacks
         ORDER BY attempted_at DESC LIMIT ?`,
      )
      .all(Math.min(limit, 20)) as Array<{
      id: string;
      timestamp: string;
      description: string;
      type: string;
      blocked_reason: string;
      signature: string | null;
    }> : [];

    // Merge and sort all events
    const merged = [
      ...events.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        eventType: e.event_type,
        description: e.description,
        signature: e.signature,
        amountUsd: e.amount_usd,
        counterparty: e.counterparty,
        deviceId: e.device_id,
        deviceName: e.device_name,
        deviceEmoji: e.device_emoji,
        source: "device" as const,
      })),
      ...atlasDecisions.map((d) => ({
        id: `atlas_${d.id}`,
        timestamp: d.timestamp,
        eventType: d.outcome === "settled" ? "earning_received" : d.outcome === "blocked" ? "attack_blocked" : "spending_sent",
        description: d.description,
        signature: d.signature,
        amountUsd: d.amount_usd,
        counterparty: d.merchant,
        deviceId: "vlt_QcCPbp3XTzHtF5",
        deviceName: "Atlas",
        deviceEmoji: "🧭",
        source: "atlas" as const,
      })),
      ...atlasAttacks.map((a) => ({
        id: `atk_${a.id}`,
        timestamp: a.timestamp,
        eventType: "attack_blocked",
        description: `Attack blocked: ${a.type.replace(/_/g, " ")} — ${a.blocked_reason}`,
        signature: a.signature,
        amountUsd: null,
        counterparty: "attacker",
        deviceId: "vlt_QcCPbp3XTzHtF5",
        deviceName: "Atlas",
        deviceEmoji: "🧭",
        source: "atlas" as const,
      })),
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);

    // Economy stats
    const totalDevices = (
      db.prepare(`SELECT COUNT(*) AS n FROM vaults`).get() as { n: number }
    ).n;

    const totalEarned = (
      db
        .prepare(
          `SELECT COALESCE(SUM(amount_usd), 0) AS total FROM device_log WHERE event_type = 'earning_received'`,
        )
        .get() as { total: number }
    ).total;

    const totalBlocked = (
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM device_log WHERE event_type = 'attack_blocked'`,
        )
        .get() as { n: number }
    ).n;

    // Add Atlas's own stats (from atlas.db)
    let atlasState: { total_spent_usd: number; total_earned_usd: number; total_attacks_blocked: number } | undefined;
    try {
      if (adb) {
        atlasState = adb
          .prepare(`SELECT total_spent_usd, total_earned_usd, total_attacks_blocked FROM atlas_state LIMIT 1`)
          .get() as typeof atlasState;
      }
    } catch { /* atlas.db might not have this table */ }

    return NextResponse.json({
      events: merged,
      economy: {
        totalDevices,
        totalEarned: totalEarned + (atlasState?.total_earned_usd ?? 0),
        totalAttacksBlocked: totalBlocked + (atlasState?.total_attacks_blocked ?? 0),
        totalVolume: totalEarned + (atlasState?.total_spent_usd ?? 0) + (atlasState?.total_earned_usd ?? 0),
      },
    });
  } catch (e) {
    console.error("[log/global]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
