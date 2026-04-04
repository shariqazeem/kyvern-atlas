import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const webhookId = req.nextUrl.searchParams.get("webhook_id");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);

  if (!webhookId) return NextResponse.json({ error: "Missing webhook_id" }, { status: 400 });

  const db = getDb();

  // Verify ownership
  const wh = db.prepare("SELECT api_key_id FROM webhooks WHERE id = ?").get(webhookId) as { api_key_id: string } | undefined;
  if (!wh || wh.api_key_id !== auth.apiKeyId) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const deliveries = db.prepare(
    "SELECT id, event_type, response_status, created_at, delivered_at FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(webhookId, limit);

  return NextResponse.json({ deliveries });
}
