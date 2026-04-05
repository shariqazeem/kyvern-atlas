import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";
import { ALERT_TYPES } from "@/lib/alerts";

export const dynamic = "force-dynamic";

function proCheck(apiKeyId: string) {
  if (getTierForApiKey(apiKeyId) !== "pro") {
    return NextResponse.json({ error: "pro_required", message: "Alerts require Pulse Pro." }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const blocked = proCheck(auth.apiKeyId);
  if (blocked) return blocked;

  const db = getDb();
  const alerts = db.prepare(
    "SELECT id, name, type, config, webhook_id, slack_url, discord_url, is_active, last_triggered_at, trigger_count, created_at FROM alerts WHERE api_key_id = ? ORDER BY created_at DESC"
  ).all(auth.apiKeyId);

  return NextResponse.json({ alerts });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ALERT_TYPES as unknown as [string, ...string[]]),
  config: z.object({
    threshold: z.number().optional(),
    period: z.enum(["1h", "6h", "24h"]).optional(),
    endpoint: z.string().optional(),
  }),
  webhook_id: z.string().optional(),
  slack_url: z.string().url().optional().or(z.literal("")),
  discord_url: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const blocked = proCheck(auth.apiKeyId);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const parsed = CreateSchema.parse(body);

    // Validate webhook ownership if provided
    if (parsed.webhook_id) {
      const db = getDb();
      const wh = db.prepare("SELECT api_key_id FROM webhooks WHERE id = ?").get(parsed.webhook_id) as { api_key_id: string } | undefined;
      if (!wh || wh.api_key_id !== auth.apiKeyId) {
        return NextResponse.json({ error: "Webhook not found" }, { status: 400 });
      }
    }

    const db = getDb();
    const id = nanoid();

    db.prepare(
      "INSERT INTO alerts (id, api_key_id, name, type, config, webhook_id, slack_url, discord_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, auth.apiKeyId, parsed.name, parsed.type, JSON.stringify(parsed.config), parsed.webhook_id || null, parsed.slack_url || null, parsed.discord_url || null);

    return NextResponse.json({ alert: { id, name: parsed.name, type: parsed.type } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

  const db = getDb();
  const alert = db.prepare("SELECT api_key_id, is_active FROM alerts WHERE id = ?").get(id) as { api_key_id: string; is_active: number } | undefined;
  if (!alert || alert.api_key_id !== auth.apiKeyId) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Check for body — if present, update specific fields; otherwise toggle is_active
  let body: Record<string, unknown> | null = null;
  try { body = await req.json(); } catch { /* no body = toggle mode */ }

  if (body && (body.slack_url !== undefined || body.discord_url !== undefined)) {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (body.slack_url !== undefined) {
      updates.push("slack_url = ?");
      params.push((body.slack_url as string) || null);
    }
    if (body.discord_url !== undefined) {
      updates.push("discord_url = ?");
      params.push((body.discord_url as string) || null);
    }
    params.push(id);

    db.prepare(`UPDATE alerts SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    return NextResponse.json({ success: true });
  }

  db.prepare("UPDATE alerts SET is_active = ? WHERE id = ?").run(alert.is_active ? 0 : 1, id);
  return NextResponse.json({ success: true, is_active: !alert.is_active });
}

export async function DELETE(req: NextRequest) {
  const auth = authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

  const db = getDb();
  const alert = db.prepare("SELECT api_key_id FROM alerts WHERE id = ?").get(id) as { api_key_id: string } | undefined;
  if (!alert || alert.api_key_id !== auth.apiKeyId) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
