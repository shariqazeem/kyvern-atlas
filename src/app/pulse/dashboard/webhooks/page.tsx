"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { ProGate } from "@/components/dashboard/pro-gate";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";


const ease = [0.25, 0.1, 0.25, 1] as const;

const EVENT_TYPES = [
  { value: "payment.received", label: "Payment Received" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "agent.new", label: "New Agent" },
  { value: "agent.repeat", label: "Repeat Agent" },
  { value: "revenue.threshold", label: "Revenue Threshold" },
  { value: "latency.spike", label: "Latency Spike" },
];

interface WebhookData {
  id: string;
  url: string;
  events: string;
  is_active: number;
  created_at: string;
  last_triggered_at: string | null;
  failure_count: number;
}

interface Delivery {
  id: string;
  event_type: string;
  response_status: number;
  created_at: string;
}

function CreateWebhookForm({ onCreated }: { onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["payment.received"]);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pulse/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url, events }),
      });
      const data = await res.json();
      if (data.webhook) {
        setSecret(data.webhook.secret);
        onCreated();
      } else {
        setError(data.error || data.details?.[0]?.message || "Failed to create");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (secret) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="text-[13px] font-semibold text-emerald-800">Webhook created — save your signing secret</span>
        </div>
        <p className="text-[12px] text-emerald-600">This secret is used to verify webhook payloads. It will not be shown again.</p>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 p-3">
          <code className="flex-1 text-[12px] font-mono text-primary break-all">{secret}</code>
          <button onClick={() => { navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-1.5 rounded hover:bg-emerald-50 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-tertiary" />}
          </button>
        </div>
        <button onClick={() => { setSecret(null); setUrl(""); setEvents(["payment.received"]); }} className="text-[12px] font-medium text-emerald-700 hover:underline">
          Done — create another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-5 space-y-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <h3 className="text-[14px] font-semibold tracking-tight">Create Webhook</h3>
      <div>
        <label className="block text-[12px] text-tertiary font-medium mb-1.5">Endpoint URL (HTTPS)</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-app.com/webhooks/pulse"
          className="w-full h-10 px-3 rounded-lg border border-black/[0.08] text-[13px] placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20 focus:border-pulse/30"
        />
      </div>
      <div>
        <label className="block text-[12px] text-tertiary font-medium mb-2">Events</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => setEvents((prev) => prev.includes(et.value) ? prev.filter((e) => e !== et.value) : [...prev, et.value])}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors",
                events.includes(et.value) ? "bg-pulse-50 border-pulse/20 text-pulse-600" : "border-black/[0.06] text-tertiary hover:border-black/[0.12]"
              )}
            >
              {et.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
      <button
        onClick={create}
        disabled={loading || !url || events.length === 0}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {loading ? "Creating..." : "Create Webhook"}
      </button>
    </div>
  );
}

function WebhookRow({ wh, onUpdate, onDelete }: { wh: WebhookData; onUpdate: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [toggling, setToggling] = useState(false);

  function loadDeliveries() {
    if (!expanded) {
      fetch(`/api/pulse/webhooks/deliveries?webhook_id=${wh.id}&limit=10`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setDeliveries(d.deliveries || []))
        .catch(() => {});
    }
    setExpanded(!expanded);
  }

  async function toggle() {
    setToggling(true);
    await fetch(`/api/pulse/webhooks?id=${wh.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !wh.is_active }),
    });
    setToggling(false);
    onUpdate();
  }

  async function remove() {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/pulse/webhooks?id=${wh.id}`, { method: "DELETE", credentials: "include" });
    onDelete();
  }

  const events: string[] = (() => { try { return JSON.parse(wh.events); } catch { return []; } })();

  return (
    <div className="border-b border-black/[0.03]/50 last:border-0">
      <div className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAFAFA] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-mono text-primary truncate">{wh.url}</p>
          <div className="flex items-center gap-2 mt-1">
            {events.slice(0, 3).map((e) => (
              <span key={e} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-tertiary">{e}</span>
            ))}
            {events.length > 3 && <span className="text-[9px] text-quaternary">+{events.length - 3}</span>}
          </div>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
          wh.is_active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {wh.is_active ? "Active" : "Disabled"}
        </span>
        {wh.failure_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
            <AlertCircle className="w-3 h-3" /> {wh.failure_count}
          </span>
        )}
        <div className="flex items-center gap-1">
          <button onClick={toggle} disabled={toggling} className="text-[10px] font-medium text-tertiary hover:text-primary px-2 py-1 rounded transition-colors">
            {wh.is_active ? "Disable" : "Enable"}
          </button>
          <button onClick={remove} className="p-1.5 rounded hover:bg-red-50 transition-colors">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
          <button onClick={loadDeliveries} className="p-1.5 rounded hover:bg-[#F0F0F0] transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3 text-tertiary" /> : <ChevronDown className="w-3 h-3 text-tertiary" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-3">
              <p className="text-[10px] text-quaternary font-medium uppercase tracking-wider mb-2">Recent Deliveries</p>
              {deliveries.length === 0 ? (
                <p className="text-[12px] text-tertiary py-2">No deliveries yet</p>
              ) : (
                <div className="space-y-1">
                  {deliveries.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 text-[11px] py-1">
                      <span className={cn("font-mono font-medium",
                        d.response_status >= 200 && d.response_status < 300 ? "text-emerald-600" :
                        d.response_status === 0 ? "text-red-500" : "text-amber-600"
                      )}>
                        {d.response_status || "ERR"}
                      </span>
                      <span className="text-tertiary">{d.event_type}</span>
                      <span className="text-quaternary ml-auto">{format(parseISO(d.created_at), "MMM d HH:mm:ss")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WebhooksContent() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  function loadWebhooks() {
    fetch("/api/pulse/webhooks", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setWebhooks(d.webhooks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadWebhooks(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-[#F0F0F0] rounded animate-pulse" />
        <div className="h-40 bg-[#F0F0F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Webhooks</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Get notified when x402 payments hit your endpoints. Signed with HMAC-SHA256.
        </p>
      </div>

      <CreateWebhookForm onCreated={loadWebhooks} />

      {webhooks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-xl border border-black/[0.06] bg-white overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
        >
          <div className="px-5 py-4 border-b border-black/[0.04]">
            <h3 className="text-[14px] font-semibold tracking-tight">Your Webhooks</h3>
          </div>
          {webhooks.map((wh) => (
            <WebhookRow key={wh.id} wh={wh} onUpdate={loadWebhooks} onDelete={loadWebhooks} />
          ))}
        </motion.div>
      )}

      {webhooks.length === 0 && (
        <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center">
          <Webhook className="w-8 h-8 text-quaternary mx-auto mb-3" />
          <p className="text-[13px] text-secondary font-medium">No webhooks configured</p>
          <p className="text-[12px] text-tertiary mt-1">Create one above to get real-time notifications.</p>
        </div>
      )}

      {/* Verification docs */}
      <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-5">
        <h3 className="text-[13px] font-semibold mb-2">Verifying Signatures</h3>
        <p className="text-[12px] text-tertiary leading-relaxed mb-3">
          Each webhook delivery includes an <code className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-black/[0.06]">X-Kyvern-Signature</code> header.
          Verify it by computing HMAC-SHA256 of the raw request body using your webhook secret.
        </p>
        <pre className="bg-[#09090B] text-gray-300 rounded-xl p-4 text-[12px] font-mono overflow-x-auto leading-relaxed">
{`const crypto = require('crypto');

function verify(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}`}
        </pre>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  return (
    <ProGate feature="Real-time webhook notifications when x402 payments hit your endpoints. HMAC-SHA256 signed.">
      <WebhooksContent />
    </ProGate>
  );
}
