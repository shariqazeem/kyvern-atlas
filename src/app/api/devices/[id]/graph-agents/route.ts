/**
 * GET /api/devices/[id]/graph-agents — list graph-based agents on a device.
 *
 * Auth: x-owner-wallet must match the vault owner.
 *
 * Used by the worker canvas in /app to render the deployed agents
 * with their last-run status. Cheaper + flatter shape than
 * /api/agents?deviceId — just what the canvas needs.
 *
 * Returns: { ok, agents: GraphAgentSummary[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { listGraphAgentsForDevice } from "@/lib/agents/graph/agent-store";
import { getVault } from "@/lib/vault-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "device_not_found" },
      { status: 404 },
    );
  }
  const requestOwner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!requestOwner || requestOwner !== vault.ownerWallet) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const agents = listGraphAgentsForDevice(params.id);
  return NextResponse.json({ ok: true, agents });
}
