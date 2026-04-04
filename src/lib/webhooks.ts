import crypto from "crypto";
import { nanoid } from "nanoid";
import { getDb } from "./db";

export const ALLOWED_EVENTS = [
  "payment.received",
  "payment.failed",
  "agent.new",
  "agent.repeat",
  "revenue.threshold",
  "latency.spike",
] as const;

export type WebhookEvent = (typeof ALLOWED_EVENTS)[number];

interface WebhookRow {
  id: string;
  url: string;
  events: string; // JSON array
  secret: string;
  failure_count: number;
}

interface EventPayload {
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  tx_hash?: string;
  network?: string;
  latency_ms?: number;
  status: string;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliverWebhook(webhook: WebhookRow, eventType: string, data: EventPayload) {
  const db = getDb();
  const deliveryId = nanoid();
  const payload = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  });

  const signature = signPayload(payload, webhook.secret);

  let responseStatus = 0;
  let responseBody = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kyvern-Signature": signature,
        "X-Kyvern-Event": eventType,
        "X-Kyvern-Delivery": deliveryId,
        "User-Agent": "KyvernLabs-Pulse/0.2.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = await res.text().catch(() => "");

    if (res.ok) {
      // Success — reset failure count, update last_triggered
      db.prepare(
        "UPDATE webhooks SET failure_count = 0, last_triggered_at = datetime('now') WHERE id = ?"
      ).run(webhook.id);
    } else {
      // Non-2xx — increment failures
      const newCount = webhook.failure_count + 1;
      db.prepare(
        "UPDATE webhooks SET failure_count = ?, last_triggered_at = datetime('now') WHERE id = ?"
      ).run(newCount, webhook.id);

      // Auto-disable after 10 consecutive failures
      if (newCount >= 10) {
        db.prepare("UPDATE webhooks SET is_active = 0 WHERE id = ?").run(webhook.id);
      }
    }
  } catch (err) {
    responseStatus = 0;
    responseBody = String(err);
    const newCount = webhook.failure_count + 1;
    db.prepare(
      "UPDATE webhooks SET failure_count = ?, last_triggered_at = datetime('now') WHERE id = ?"
    ).run(newCount, webhook.id);
    if (newCount >= 10) {
      db.prepare("UPDATE webhooks SET is_active = 0 WHERE id = ?").run(webhook.id);
    }
  }

  // Log delivery
  db.prepare(`
    INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, response_status, response_body, delivered_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(deliveryId, webhook.id, eventType, payload, responseStatus, responseBody.slice(0, 1000));
}

/**
 * Fire all webhooks for a given api_key_id matching the event type.
 * Non-blocking — runs async without awaiting.
 */
export function fireWebhooks(apiKeyId: string, eventType: WebhookEvent, data: EventPayload) {
  const db = getDb();

  const webhooks = db.prepare(
    "SELECT id, url, events, secret, failure_count FROM webhooks WHERE api_key_id = ? AND is_active = 1"
  ).all(apiKeyId) as WebhookRow[];

  for (const wh of webhooks) {
    try {
      const subscribedEvents: string[] = JSON.parse(wh.events);
      if (subscribedEvents.includes(eventType)) {
        // Fire-and-forget
        deliverWebhook(wh, eventType, data).catch(() => {});
      }
    } catch {
      // Invalid JSON in events column — skip
    }
  }
}
