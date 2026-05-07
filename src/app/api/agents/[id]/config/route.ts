import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgentConfig } from "@/lib/agents/store";
import { validateConfig } from "@/lib/agents/config-schema";

/**
 * POST /api/agents/[id]/config
 *
 * Body: { config: <template-shaped object> }
 * Returns: { ok: true, config } | { ok: false, errors: string[] }
 *
 * Phase 3 — every worker stores its user-editable settings in
 * `agents.config_json`. The shape depends on `agents.template`:
 *
 *   bounty_hunter (Sentinel)  → { skills, min_payout_usd, cadence_minutes }
 *   whale_tracker (Wren)      → { watchlist[], cadence_minutes }
 *   token_pulse  (Pulse)      → { triggers[], cadence_minutes }
 *
 * Validated via Zod at this boundary. Runner reads via parseConfig at
 * its own boundary so a bad row never crashes a tick.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agent = getAgent(params.id);
  if (!agent) {
    return NextResponse.json(
      { ok: false, errors: ["agent not found"] },
      { status: 404 },
    );
  }

  let body: { config?: unknown };
  try {
    body = (await req.json()) as { config?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["invalid json"] },
      { status: 400 },
    );
  }

  const result = validateConfig(agent.template, body.config);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  updateAgentConfig(agent.id, result.config);
  return NextResponse.json({ ok: true, config: result.config });
}
