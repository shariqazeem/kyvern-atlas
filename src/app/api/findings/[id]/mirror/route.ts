import { NextRequest, NextResponse } from "next/server";
import {
  getSignal,
  listAgentsByDevice,
  recordSignalMirrored,
  updateAgentConfig,
} from "@/lib/agents/store";
import type { PulseConfig } from "@/lib/agents/types";

/**
 * POST /api/findings/[id]/mirror  (Phase 4 — Frontier Grand Champion)
 *
 * Wren → Pulse bridge. Owner taps "Mirror this swap" on a wallet_alert
 * finding; we append a new trigger to the device's Pulse worker and
 * stamp the originating Wren signal with the trigger id.
 *
 * Body: { asset?: string, threshold_usd: number, spend_usdc: number,
 *         direction?: 'below' | 'above' }
 *
 * Defaults:
 *   asset      = whatever the alert payload's swap token is, else 'SOL'
 *   direction  = mirrors the whale's direction (buy → below, sell → above)
 *   threshold  = required (UI pre-fills 5% below current price)
 *   spend_usdc = required (UI pre-fills $5)
 *
 * Returns: { ok, triggerId, alreadyMirrored? }
 */

interface MirrorBody {
  asset?: string;
  direction?: "below" | "above";
  threshold_usd?: number;
  spend_usdc?: number;
  merchant?: string;
  memo?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const signal = getSignal(params.id);
  if (!signal) {
    return NextResponse.json(
      { ok: false, reason: "finding not found" },
      { status: 404 },
    );
  }
  if (signal.kind !== "wallet_alert") {
    return NextResponse.json(
      { ok: false, reason: "only wallet_alert findings can be mirrored" },
      { status: 400 },
    );
  }
  if (signal.mirroredPulseTriggerId) {
    return NextResponse.json({
      ok: true,
      alreadyMirrored: true,
      triggerId: signal.mirroredPulseTriggerId,
    });
  }

  let body: MirrorBody = {};
  try {
    body = (await req.json()) as MirrorBody;
  } catch {
    /* body optional — defaults below */
  }

  // Find the device's Pulse worker.
  const agents = listAgentsByDevice(signal.deviceId);
  const pulse = agents.find(
    (a) => a.template === "token_pulse" && a.status !== "retired",
  );
  if (!pulse) {
    return NextResponse.json(
      { ok: false, reason: "no Pulse worker on this device" },
      { status: 404 },
    );
  }

  const asset = (body.asset ?? "SOL").toUpperCase();
  const direction: "below" | "above" =
    body.direction === "above" ? "above" : "below";
  const threshold = Number(body.threshold_usd);
  const spend = Number(body.spend_usdc);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return NextResponse.json(
      { ok: false, reason: "threshold_usd required and > 0" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(spend) || spend <= 0) {
    return NextResponse.json(
      { ok: false, reason: "spend_usdc required and > 0" },
      { status: 400 },
    );
  }

  const triggerId = `trg_mirror_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const config = (pulse.config as PulseConfig) ?? {
    triggers: [],
    cadence_minutes: 1,
  };
  const nextConfig: PulseConfig = {
    triggers: [
      ...(config.triggers ?? []),
      {
        id: triggerId,
        asset,
        direction,
        threshold_usd: threshold,
        amount_usd: spend,
        merchant: body.merchant ?? "api.openai.com",
        memo:
          body.memo ??
          `Mirrored from ${signal.subject.slice(0, 60)}`,
      },
    ],
    cadence_minutes: config.cadence_minutes ?? 1,
  };
  updateAgentConfig(pulse.id, nextConfig);
  recordSignalMirrored(signal.id, triggerId);

  return NextResponse.json({ ok: true, triggerId });
}
