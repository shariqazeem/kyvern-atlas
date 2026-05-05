import { NextRequest, NextResponse } from "next/server";
import { getAgent, listThoughts } from "@/lib/agents/store";
import { getDb } from "@/lib/db";

/**
 * GET /api/agents/[id]
 * Returns the agent + recent thoughts. Live Engine adds lastAction (most
 * recent economic-tool thought) + lastFinding (most recent signal) so
 * the per-worker page can render the same verb + outcome line shape as
 * the home tile — i.e. the detail page reads as a zoom-in of the tile.
 */
function brandFromHint(hint: string | null | undefined): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  if (h.includes("superteam")) return "Superteam";
  if (h.includes("colosseum")) return "Colosseum";
  if (h.includes("helius")) return "Helius";
  if (h.includes("anza-xyz") || h.includes("agave")) return "Agave";
  if (h.includes("anchor")) return "Anchor";
  if (h.includes("metaplex")) return "Metaplex";
  if (h.includes("solana.com") || h.includes("solana foundation"))
    return "Solana Foundation";
  if (h.includes("jupiter") || h.includes("jup.ag")) return "Jupiter";
  if (h.includes("squads")) return "Squads";
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const agent = getAgent(params.id);
    if (!agent) {
      return NextResponse.json({ error: "agent not found" }, { status: 404 });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("thoughtsLimit") ?? "20", 10),
      100,
    );
    const thoughts = listThoughts(params.id, limit);

    // Live Engine — most recent economic-tool action for this agent,
    // and most recent signal. The detail page renders a one-line
    // "live state" strip below the chassis using these.
    const db = getDb();
    interface ActionRow {
      id: string;
      timestamp: number;
      tool_used: string;
      signature: string | null;
      signature_status: string | null;
      amount_usd: number | null;
      counterparty: string | null;
      decision_json: string | null;
    }
    const actionRow = db
      .prepare(
        `SELECT id, timestamp, tool_used, signature, signature_status,
                amount_usd, counterparty, decision_json
           FROM agent_thoughts
          WHERE agent_id = ?
            AND tool_used IN ('post_task','claim_task','complete_task','stake_on_finding','subscribe_to_agent')
          ORDER BY timestamp DESC
          LIMIT 1`,
      )
      .get(params.id) as ActionRow | undefined;

    let lastAction: {
      id: string;
      timestamp: number;
      tool: string;
      amountUsd: number | null;
      signature: string | null;
      signatureStatus: "success" | "failed" | null;
      counterparty: string | null;
      message: string | null;
      brand: string | null;
    } | null = null;
    if (actionRow) {
      let toolMessage: string | null = null;
      try {
        if (actionRow.decision_json) {
          const d = JSON.parse(actionRow.decision_json) as {
            toolResult?: { message?: string };
          };
          if (typeof d.toolResult?.message === "string")
            toolMessage = d.toolResult.message.slice(0, 200);
        }
      } catch {
        /* ignore */
      }
      lastAction = {
        id: actionRow.id,
        timestamp: actionRow.timestamp,
        tool: actionRow.tool_used,
        amountUsd: actionRow.amount_usd,
        signature: actionRow.signature,
        signatureStatus: actionRow.signature_status as
          | "success"
          | "failed"
          | null,
        counterparty: actionRow.counterparty,
        message: toolMessage,
        brand: brandFromHint(actionRow.counterparty) ?? brandFromHint(toolMessage),
      };
    }

    interface SignalRow {
      kind: string;
      subject: string;
      source_url: string | null;
      created_at: number;
    }
    const signalRow = db
      .prepare(
        `SELECT kind, subject, source_url, created_at
           FROM signals
          WHERE agent_id = ?
          ORDER BY created_at DESC
          LIMIT 1`,
      )
      .get(params.id) as SignalRow | undefined;
    const lastFinding = signalRow
      ? {
          kind: signalRow.kind,
          subject: signalRow.subject,
          brand: brandFromHint(signalRow.source_url),
          ts: signalRow.created_at,
        }
      : null;

    return NextResponse.json({ agent, thoughts, lastAction, lastFinding });
  } catch (e) {
    console.error("[agents/id]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
