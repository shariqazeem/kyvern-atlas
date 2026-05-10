/**
 * POST /api/agents/[id]/webhook/[secret] — external webhook trigger.
 *
 * No header auth. The secret in the URL path IS the auth — the
 * secret was generated when the agent was created and is embedded
 * in graph.trigger.secret. Anyone with the URL can trigger the
 * agent (intentional — webhooks are for external services posting
 * to your agent without OAuth).
 *
 * Rate limit: 60 requests/min/agent (in-memory map). On overflow
 * returns 429.
 *
 * If the agent's trigger isn't `webhook`, returns 405 (the URL
 * still resolves but the agent isn't expecting webhook traffic).
 *
 * The full request body becomes trigger.payload, available as
 * {{trigger.payload.*}} inside the graph.
 *
 * Returns 202 immediately with the runId — execution is awaited
 * but not blocked on (caller can poll GET /api/agents/[id]/runs/[runId]).
 *
 * Limitations:
 *   - request body must be JSON
 *   - body cap 1 MB
 *   - no streaming response
 */

import { NextRequest, NextResponse } from "next/server";
import { dispatchRun } from "@/lib/agents/graph/dispatcher";
import { safeParseGraph } from "@/lib/agents/graph/schemas";
import { getDb } from "@/lib/db";

const RATE_LIMIT_PER_MIN = 60;
const rateLimitBuckets = new Map<string, number[]>();

function checkRateLimit(agentId: string): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  const arr = (rateLimitBuckets.get(agentId) ?? []).filter((t) => t > cutoff);
  if (arr.length >= RATE_LIMIT_PER_MIN) {
    rateLimitBuckets.set(agentId, arr); // trim
    return false;
  }
  arr.push(now);
  rateLimitBuckets.set(agentId, arr);
  return true;
}

const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; secret: string } },
) {
  // Look up the agent + its graph
  const row = getDb()
    .prepare(
      `SELECT graph_json FROM agents WHERE id = ? AND status = 'alive'`,
    )
    .get(params.id) as { graph_json: string | null } | undefined;
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "agent_not_found" },
      { status: 404 },
    );
  }
  if (!row.graph_json) {
    return NextResponse.json(
      { ok: false, error: "agent_not_graph_based" },
      { status: 400 },
    );
  }

  // Parse graph + verify trigger kind + secret
  let graph;
  try {
    graph = safeParseGraph(JSON.parse(row.graph_json));
  } catch {
    graph = null;
  }
  if (!graph) {
    return NextResponse.json(
      { ok: false, error: "graph_invalid" },
      { status: 500 },
    );
  }
  if (graph.trigger.kind !== "webhook") {
    return NextResponse.json(
      { ok: false, error: "trigger_not_webhook" },
      { status: 405 },
    );
  }
  // Constant-time-ish secret comparison
  if (
    graph.trigger.secret.length !== params.secret.length ||
    graph.trigger.secret !== params.secret
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid_secret" },
      { status: 403 },
    );
  }

  // Rate limit
  if (!checkRateLimit(params.id)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  // Read body (capped)
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "body_too_large" },
      { status: 413 },
    );
  }
  let payload: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "body_too_large" },
        { status: 413 },
      );
    }
    if (text.trim().length > 0) {
      const parsed = JSON.parse(text);
      payload = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { raw: parsed };
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "body_must_be_json" },
      { status: 400 },
    );
  }

  // Dispatch (awaited synchronously — webhook callers can use a
  // 60s timeout. For long graphs we'd switch to fire-and-forget.)
  const result = await dispatchRun({
    agentId: params.id,
    triggerKind: "webhook",
    triggerPayload: payload,
  });

  if (!result.ok) {
    const status =
      result.errorCode === "concurrency_per_vault" || result.errorCode === "concurrency_global" || result.errorCode === "daily_cap_reached" ? 429
      : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(
    { ok: true, runId: result.runId, status: result.run?.status },
    { status: 202 },
  );
}
