"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, Trash2, TrendingDown, TrendingUp, UserPlus, Timer, Target } from "lucide-react";
import { ProGate } from "@/components/dashboard/pro-gate";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const ease = [0.25, 0.1, 0.25, 1] as const;

const ALERT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  revenue_drop: { label: "Revenue Drop", icon: TrendingDown, color: "text-red-500 bg-red-50" },
  revenue_spike: { label: "Revenue Spike", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
  new_agent: { label: "New Agent", icon: UserPlus, color: "text-blue-600 bg-blue-50" },
  latency_spike: { label: "Latency Spike", icon: Timer, color: "text-amber-600 bg-amber-50" },
  daily_target: { label: "Daily Target", icon: Target, color: "text-purple-600 bg-purple-50" },
};

interface AlertData {
  id: string;
  name: string;
  type: string;
  config: string;
  webhook_id: string | null;
  is_active: number;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

interface WebhookOption { id: string; url: string }

function configSummary(type: string, configStr: string): string {
  try {
    const c = JSON.parse(configStr);
    switch (type) {
      case "revenue_drop": return `≥${c.threshold}% drop in ${c.period || "24h"}`;
      case "revenue_spike": return `≥${c.threshold}% spike in ${c.period || "24h"}`;
      case "new_agent": return c.endpoint ? `on ${c.endpoint}` : "any endpoint";
      case "latency_spike": return `>${c.threshold}ms${c.endpoint ? ` on ${c.endpoint}` : ""}`;
      case "daily_target": return `$${c.threshold} daily revenue`;
      default: return configStr;
    }
  } catch { return configStr; }
}

function CreateAlertForm({ webhooks, onCreated }: { webhooks: WebhookOption[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("revenue_drop");
  const [threshold, setThreshold] = useState("");
  const [period, setPeriod] = useState("24h");
  const [endpoint, setEndpoint] = useState("");
  const [webhookId, setWebhookId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsThreshold = ["revenue_drop", "revenue_spike", "latency_spike", "daily_target"].includes(type);
  const needsPeriod = ["revenue_drop", "revenue_spike"].includes(type);
  const needsEndpoint = ["new_agent", "latency_spike"].includes(type);

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const config: Record<string, unknown> = {};
      if (needsThreshold) config.threshold = parseFloat(threshold);
      if (needsPeriod) config.period = period;
      if (needsEndpoint && endpoint) config.endpoint = endpoint;

      const res = await fetch("/api/pulse/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, type, config, webhook_id: webhookId || undefined }),
      });
      const data = await res.json();
      if (data.alert) {
        setName(""); setThreshold(""); setEndpoint("");
        onCreated();
      } else {
        setError(data.error || "Failed");
      }
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  }

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white p-5 space-y-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <h3 className="text-[14px] font-semibold tracking-tight">Create Alert</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] text-tertiary font-medium mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Revenue drop alert"
            className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[13px] placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20" />
        </div>
        <div>
          <label className="block text-[12px] text-tertiary font-medium mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-pulse/20">
            {Object.entries(ALERT_TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {needsThreshold && (
          <div>
            <label className="block text-[12px] text-tertiary font-medium mb-1">
              {type === "latency_spike" ? "Threshold (ms)" : type === "daily_target" ? "Target ($)" : "Threshold (%)"}
            </label>
            <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={type === "latency_spike" ? "500" : type === "daily_target" ? "100" : "50"}
              className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-pulse/20" />
          </div>
        )}
        {needsPeriod && (
          <div>
            <label className="block text-[12px] text-tertiary font-medium mb-1">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-pulse/20">
              <option value="1h">1 hour</option>
              <option value="6h">6 hours</option>
              <option value="24h">24 hours</option>
            </select>
          </div>
        )}
        {needsEndpoint && (
          <div>
            <label className="block text-[12px] text-tertiary font-medium mb-1">Endpoint (optional)</label>
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="/api/search"
              className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-pulse/20" />
          </div>
        )}
        <div>
          <label className="block text-[12px] text-tertiary font-medium mb-1">Notify via webhook</label>
          <select value={webhookId} onChange={(e) => setWebhookId(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-pulse/20">
            <option value="">None</option>
            {webhooks.map((w) => (
              <option key={w.id} value={w.id}>{w.url.slice(0, 40)}...</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}

      <button onClick={create} disabled={loading || !name || (needsThreshold && !threshold)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors">
        <Plus className="w-3.5 h-3.5" />
        {loading ? "Creating..." : "Create Alert"}
      </button>
    </div>
  );
}

function AlertsContent() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookOption[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      fetch("/api/pulse/alerts", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/pulse/webhooks", { credentials: "include" }).then((r) => r.json()).catch(() => ({ webhooks: [] })),
    ]).then(([a, w]) => {
      setAlerts(a.alerts || []);
      setWebhooks((w.webhooks || []).map((wh: { id: string; url: string }) => ({ id: wh.id, url: wh.url })));
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggleAlert(id: string) {
    await fetch(`/api/pulse/alerts?id=${id}`, { method: "PATCH", credentials: "include" });
    load();
  }

  async function deleteAlert(id: string) {
    if (!confirm("Delete this alert?")) return;
    await fetch(`/api/pulse/alerts?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-[#F0F0F0] dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-40 bg-[#F0F0F0] dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Alerts</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Get notified on revenue changes, new agents, and latency issues.
        </p>
      </div>

      <CreateAlertForm webhooks={webhooks} onCreated={load} />

      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
        >
          <div className="px-5 py-4 border-b border-black/[0.04] dark:border-gray-800">
            <h3 className="text-[14px] font-semibold tracking-tight">Your Alerts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-black/[0.04] dark:border-gray-800">
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Config</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Triggers</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Last</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const typeConfig = ALERT_TYPE_CONFIG[a.type] || { label: a.type, icon: Bell, color: "text-tertiary bg-[#F0F0F0] dark:bg-gray-700" };
                  const TypeIcon = typeConfig.icon;
                  return (
                    <tr key={a.id} className="border-b border-black/[0.03] dark:border-gray-800/50 last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors">
                      <td className="px-5 py-3">
                        <span className={cn("text-[13px] font-medium", a.is_active ? "text-primary" : "text-quaternary line-through")}>
                          {a.name}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider", typeConfig.color)}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-tertiary font-mono">{configSummary(a.type, a.config)}</td>
                      <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{a.trigger_count}</td>
                      <td className="px-5 py-3 text-right text-[11px] text-quaternary">
                        {a.last_triggered_at ? format(parseISO(a.last_triggered_at), "MMM d HH:mm") : "Never"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleAlert(a.id)} className="text-[10px] font-medium text-tertiary hover:text-primary px-2 py-1 rounded transition-colors">
                            {a.is_active ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => deleteAlert(a.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {alerts.length === 0 && (
        <div className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white p-8 text-center">
          <Bell className="w-8 h-8 text-quaternary mx-auto mb-3" />
          <p className="text-[13px] text-secondary font-medium">No alerts configured</p>
          <p className="text-[12px] text-tertiary mt-1">Create one above to get notified on revenue changes and new agents.</p>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <ProGate feature="Smart alerts for revenue drops, new agents, latency spikes, and daily targets. Optionally linked to webhooks.">
      <AlertsContent />
    </ProGate>
  );
}
