import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";
import { ALLOWED_EVENTS } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

function proCheck(apiKeyId: string) {
  const tier = getTierForApiKey(apiKeyId);
  if (tier !== "pro") {
    return NextResponse.json(
      { error: "pro_required", message: "Webhooks require Pulse Pro." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const blocked = proCheck(auth.apiKeyId);
  if (blocked) return blocked;

  const db = getDb();
  const webhooks = db.prepare(
    "SELECT id, url, events, is_active, created_at, last_triggered_at, failure_count FROM webhooks WHERE api_key_id = ? ORDER BY created_at DESC"
  ).all(auth.apiKeyId);

  return NextResponse.json({ webhooks });
}

const CreateSchema = z.object({
  url: z.string().url().startsWith("https://", { message: "URL must use HTTPS" }),
  events: z.array(z.enum(ALLOWED_EVENTS as unknown as [string, ...string[]])).min(1),
});

export async function POST(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const blocked = proCheck(auth.apiKeyId);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const parsed = CreateSchema.parse(body);

    const db = getDb();
    const id = nanoid();
    const secret = crypto.randomBytes(32).toString("hex");

    db.prepare(
      "INSERT INTO webhooks (id, api_key_id, url, events, secret) VALUES (?, ?, ?, ?, ?)"
    ).run(id, auth.apiKeyId, parsed.url, JSON.stringify(parsed.events), secret);

    return NextResponse.json({
      webhook: { id, url: parsed.url, events: parsed.events, secret },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  url: z.string().url().startsWith("https://").optional(),
  events: z.array(z.enum(ALLOWED_EVENTS as unknown as [string, ...string[]])).min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing webhook id" }, { status: 400 });

  const db = getDb();
  const wh = db.prepare("SELECT api_key_id FROM webhooks WHERE id = ?").get(id) as { api_key_id: string } | undefined;
  if (!wh || wh.api_key_id !== auth.apiKeyId) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSchema.parse(body);

    if (parsed.url) db.prepare("UPDATE webhooks SET url = ? WHERE id = ?").run(parsed.url, id);
    if (parsed.events) db.prepare("UPDATE webhooks SET events = ? WHERE id = ?").run(JSON.stringify(parsed.events), id);
    if (parsed.is_active !== undefined) {
      db.prepare("UPDATE webhooks SET is_active = ?, failure_count = 0 WHERE id = ?").run(parsed.is_active ? 1 : 0, id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing webhook id" }, { status: 400 });

  const db = getDb();
  const wh = db.prepare("SELECT api_key_id FROM webhooks WHERE id = ?").get(id) as { api_key_id: string } | undefined;
  if (!wh || wh.api_key_id !== auth.apiKeyId) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM webhook_deliveries WHERE webhook_id = ?").run(id);
  db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
