/**
 * POST /api/agents/spawn-graph — create a graph-based agent.
 *
 * Auth: x-owner-wallet must match the device's vault owner.
 *
 * Body:
 *   {
 *     deviceId: string,
 *     name: string,
 *     emoji?: string,
 *     graph: AgentGraph,
 *     isPublic?: boolean,
 *     metadata?: object,
 *   }
 *
 * Returns: { ok: true, agent: Agent } on 201
 *          { ok: false, error, details? } on 400/401/404
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGraphAgent } from "@/lib/agents/graph/agent-store";
import { AgentGraphSchema } from "@/lib/agents/graph/schemas";
import { getVault } from "@/lib/vault-store";

const BodySchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1).max(64),
  emoji: z.string().min(1).max(8).optional(),
  graph: AgentGraphSchema,
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "body_must_be_json" },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { deviceId, name, emoji, graph, isPublic, metadata } = parsed.data;

  const vault = getVault(deviceId);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "device_not_found" },
      { status: 404 },
    );
  }

  const requestOwner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!requestOwner) {
    return NextResponse.json(
      { ok: false, error: "owner_wallet_header_missing" },
      { status: 401 },
    );
  }
  if (requestOwner !== vault.ownerWallet) {
    return NextResponse.json(
      {
        ok: false,
        error: "owner_mismatch",
        message: `caller wallet ${requestOwner.slice(0, 8)}… does not own this vault`,
      },
      { status: 401 },
    );
  }

  try {
    const agent = createGraphAgent({
      deviceId,
      name,
      emoji: emoji ?? "🤖",
      graph,
      isPublic,
      metadata,
    });
    return NextResponse.json({ ok: true, agent }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "create_failed",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
