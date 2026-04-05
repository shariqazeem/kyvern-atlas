export interface NotificationPayload {
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  fields?: { name: string; value: string }[];
  url?: string;
}

// Send to Slack webhook URL
export async function sendSlackNotification(webhookUrl: string, payload: NotificationPayload): Promise<boolean> {
  const colorMap = { info: "#3b82f6", warning: "#f59e0b", success: "#10b981", error: "#ef4444" };

  const body = {
    attachments: [{
      color: colorMap[payload.type],
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: payload.title, emoji: true },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: payload.message },
        },
        ...(payload.fields ? [{
          type: "section",
          fields: payload.fields.map((f) => ({
            type: "mrkdwn",
            text: `*${f.name}*\n${f.value}`,
          })),
        }] : []),
        ...(payload.url ? [{
          type: "actions",
          elements: [{
            type: "button",
            text: { type: "plain_text", text: "View in Pulse" },
            url: payload.url,
          }],
        }] : []),
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "Sent by KyvernLabs Pulse" }],
        },
      ],
    }],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Send to Discord webhook URL
export async function sendDiscordNotification(webhookUrl: string, payload: NotificationPayload): Promise<boolean> {
  const colorMap = { info: 0x3b82f6, warning: 0xf59e0b, success: 0x10b981, error: 0xef4444 };

  const body = {
    embeds: [{
      title: payload.title,
      description: payload.message,
      color: colorMap[payload.type],
      fields: payload.fields?.map((f) => ({ name: f.name, value: f.value, inline: true })) || [],
      footer: { text: "KyvernLabs Pulse" },
      timestamp: new Date().toISOString(),
      ...(payload.url ? { url: payload.url } : {}),
    }],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Format alert data into notification payload
export function formatAlertNotification(alertName: string, alertType: string, data: Record<string, unknown>): NotificationPayload {
  const typeLabels: Record<string, string> = {
    revenue_drop: "Revenue Drop Alert",
    revenue_spike: "Revenue Spike Alert",
    new_agent: "New Agent Detected",
    latency_spike: "Latency Spike Alert",
    daily_target: "Daily Target Alert",
  };

  const typeEmoji: Record<string, string> = {
    revenue_drop: "\u{1F4C9}",
    revenue_spike: "\u{1F4C8}",
    new_agent: "\u{1F195}",
    latency_spike: "\u26A1",
    daily_target: "\u{1F3AF}",
  };

  const title = `${typeEmoji[alertType] || "\u{1F514}"} ${typeLabels[alertType] || alertType}: ${alertName}`;

  const fields: { name: string; value: string }[] = [];
  if (data.endpoint) fields.push({ name: "Endpoint", value: String(data.endpoint) });
  if (data.amount_usd) fields.push({ name: "Amount", value: `$${data.amount_usd}` });
  if (data.payer_address) fields.push({ name: "Agent", value: `${String(data.payer_address).slice(0, 10)}...` });
  if (data.latency_ms) fields.push({ name: "Latency", value: `${data.latency_ms}ms` });

  const notifType = alertType === "revenue_drop" || alertType === "latency_spike" ? "warning"
    : alertType === "new_agent" || alertType === "daily_target" ? "success" : "info";

  return {
    title,
    message: `Alert "${alertName}" was triggered.`,
    type: notifType,
    fields,
    url: "https://kyvernlabs.com/pulse/dashboard/alerts",
  };
}
