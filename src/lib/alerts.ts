import { getDb } from "./db";
import { fireWebhooks } from "./webhooks";

export const ALERT_TYPES = [
  "revenue_drop",
  "revenue_spike",
  "new_agent",
  "latency_spike",
  "daily_target",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

interface AlertRow {
  id: string;
  api_key_id: string;
  name: string;
  type: string;
  config: string;
  webhook_id: string | null;
  last_triggered_at: string | null;
  trigger_count: number;
}

interface EventContext {
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  latency_ms?: number;
  status: string;
  tx_hash?: string;
  network?: string;
}

const DEBOUNCE_MS = 15 * 60 * 1000; // 15 minutes

function shouldDebounce(lastTriggered: string | null): boolean {
  if (!lastTriggered) return false;
  return Date.now() - new Date(lastTriggered).getTime() < DEBOUNCE_MS;
}

function triggerAlert(alert: AlertRow, reason: string, event: EventContext) {
  const db = getDb();

  db.prepare(
    "UPDATE alerts SET last_triggered_at = datetime('now'), trigger_count = trigger_count + 1 WHERE id = ?"
  ).run(alert.id);

  // If linked to a webhook, fire it
  if (alert.webhook_id) {
    const wh = db.prepare("SELECT id, url, events, secret, failure_count FROM webhooks WHERE id = ? AND is_active = 1").get(alert.webhook_id) as {
      id: string; url: string; events: string; secret: string; failure_count: number;
    } | undefined;

    if (wh) {
      // Use the webhook firing mechanism with alert-specific event
      fireWebhooks(alert.api_key_id, "revenue.threshold", {
        endpoint: event.endpoint,
        amount_usd: event.amount_usd,
        payer_address: event.payer_address,
        tx_hash: event.tx_hash,
        network: event.network,
        latency_ms: event.latency_ms,
        status: `alert:${alert.type}:${reason}`,
      });
    }
  }
}

function evaluateRevenueChange(alert: AlertRow, config: { threshold: number; period?: string }, direction: "drop" | "spike") {
  const db = getDb();
  const hours = config.period === "1h" ? 1 : config.period === "6h" ? 6 : 24;
  const now = new Date();
  const periodStart = new Date(now.getTime() - hours * 3600000).toISOString();
  const prevStart = new Date(now.getTime() - hours * 2 * 3600000).toISOString();

  const current = db.prepare(
    "SELECT COALESCE(SUM(amount_usd), 0) as rev FROM events WHERE api_key_id = ? AND timestamp >= ?"
  ).get(alert.api_key_id, periodStart) as { rev: number };

  const previous = db.prepare(
    "SELECT COALESCE(SUM(amount_usd), 0) as rev FROM events WHERE api_key_id = ? AND timestamp >= ? AND timestamp < ?"
  ).get(alert.api_key_id, prevStart, periodStart) as { rev: number };

  if (previous.rev === 0) return false;

  const changePct = ((current.rev - previous.rev) / previous.rev) * 100;

  if (direction === "drop" && changePct <= -config.threshold) return true;
  if (direction === "spike" && changePct >= config.threshold) return true;
  return false;
}

/**
 * Evaluate all active alerts for a given user after an event is ingested.
 * Runs synchronously — fast DB queries only.
 */
export function evaluateAlerts(apiKeyId: string, event: EventContext) {
  const db = getDb();

  const alerts = db.prepare(
    "SELECT * FROM alerts WHERE api_key_id = ? AND is_active = 1"
  ).all(apiKeyId) as AlertRow[];

  for (const alert of alerts) {
    if (shouldDebounce(alert.last_triggered_at)) continue;

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(alert.config);
    } catch {
      continue;
    }

    let triggered = false;
    let reason = "";

    switch (alert.type) {
      case "revenue_drop": {
        triggered = evaluateRevenueChange(alert, config as { threshold: number; period?: string }, "drop");
        reason = `Revenue dropped ≥${config.threshold}% in ${config.period || "24h"}`;
        break;
      }

      case "revenue_spike": {
        triggered = evaluateRevenueChange(alert, config as { threshold: number; period?: string }, "spike");
        reason = `Revenue spiked ≥${config.threshold}% in ${config.period || "24h"}`;
        break;
      }

      case "new_agent": {
        const filterEndpoint = config.endpoint as string | undefined;
        let query = "SELECT COUNT(*) as count FROM events WHERE api_key_id = ? AND payer_address = ?";
        const params: (string | number)[] = [apiKeyId, event.payer_address];
        if (filterEndpoint) {
          query += " AND endpoint = ?";
          params.push(filterEndpoint);
        }
        const prev = db.prepare(query).get(...params) as { count: number };
        // Count of 1 means this is the FIRST event from this agent (the one just inserted)
        triggered = prev.count <= 1;
        reason = `New agent ${event.payer_address.slice(0, 10)}... on ${filterEndpoint || "any endpoint"}`;
        break;
      }

      case "latency_spike": {
        const threshold = config.threshold as number;
        const filterEndpoint = config.endpoint as string | undefined;
        if (event.latency_ms && event.latency_ms > threshold) {
          if (!filterEndpoint || event.endpoint === filterEndpoint) {
            triggered = true;
            reason = `Latency ${event.latency_ms}ms > ${threshold}ms on ${event.endpoint}`;
          }
        }
        break;
      }

      case "daily_target": {
        const target = config.threshold as number;
        const today = new Date().toISOString().split("T")[0];
        const todayRev = db.prepare(
          "SELECT COALESCE(SUM(amount_usd), 0) as rev FROM events WHERE api_key_id = ? AND date(timestamp) = ?"
        ).get(apiKeyId, today) as { rev: number };
        triggered = todayRev.rev >= target;
        reason = `Daily revenue $${todayRev.rev.toFixed(2)} reached target $${target}`;
        break;
      }
    }

    if (triggered) {
      triggerAlert(alert, reason, event);
    }
  }
}
