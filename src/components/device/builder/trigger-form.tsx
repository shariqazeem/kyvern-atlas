"use client";

/**
 * TriggerForm — pick when the agent runs.
 *
 * Four kinds: manual / interval / cron / webhook. Each has a tiny
 * inline form for its specifics. Webhook auto-generates a secret
 * on first switch (so the user gets a working URL immediately).
 */

import { useState } from "react";
import { Copy } from "lucide-react";
import { randomUUID } from "@/lib/uuid-shim";
import type { TriggerDef } from "@/lib/agents/graph/types";

interface Props {
  trigger: TriggerDef;
  onChange: (next: TriggerDef) => void;
  /** When editing an existing agent, pass its id so we can show
   *  the live webhook URL. */
  agentId?: string | null;
}

export function TriggerForm({ trigger, onChange, agentId }: Props) {
  function setKind(kind: TriggerDef["kind"]) {
    if (trigger.kind === kind) return;
    switch (kind) {
      case "manual":
        return onChange({ kind: "manual" });
      case "interval":
        return onChange({ kind: "interval", ms: 3_600_000 }); // 1h default
      case "cron":
        return onChange({ kind: "cron", expr: "0 * * * *" }); // hourly
      case "webhook":
        return onChange({ kind: "webhook", secret: generateSecret() });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Kind picker */}
      <div className="flex gap-1.5 flex-wrap">
        {(["manual", "interval", "cron", "webhook"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium tracking-[-0.005em] transition"
            style={{
              background: trigger.kind === k ? "#0A0A0A" : "rgba(15,23,42,0.04)",
              color: trigger.kind === k ? "#FFFFFF" : "#0A0A0A",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Kind-specific config */}
      {trigger.kind === "manual" && (
        <p className="text-[11.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
          The agent runs only when you click {`"Test run"`} or {`"Run now"`} on the detail page.
        </p>
      )}

      {trigger.kind === "interval" && (
        <IntervalForm trigger={trigger} onChange={onChange} />
      )}

      {trigger.kind === "cron" && (
        <CronForm trigger={trigger} onChange={onChange} />
      )}

      {trigger.kind === "webhook" && (
        <WebhookForm trigger={trigger} onChange={onChange} agentId={agentId ?? null} />
      )}
    </div>
  );
}

/* ─── Interval ───────────────────────────────────────────────── */

const PRESETS: Array<{ label: string; ms: number }> = [
  { label: "Every 5 min", ms: 300_000 },
  { label: "Every 15 min", ms: 900_000 },
  { label: "Every hour", ms: 3_600_000 },
  { label: "Every 6 hours", ms: 21_600_000 },
  { label: "Every 24 hours", ms: 86_400_000 },
];

function IntervalForm({
  trigger,
  onChange,
}: {
  trigger: Extract<TriggerDef, { kind: "interval" }>;
  onChange: (t: TriggerDef) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.ms}
            type="button"
            onClick={() => onChange({ kind: "interval", ms: p.ms })}
            className="px-2 py-1 rounded text-[11px] font-mono"
            style={{
              background: trigger.ms === p.ms ? "rgba(34,197,94,0.10)" : "rgba(15,23,42,0.04)",
              color: trigger.ms === p.ms ? "#15803D" : "#0A0A0A",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <span
          className="font-mono uppercase tracking-[0.10em]"
          style={{ fontSize: 9, color: "#9CA3AF" }}
        >
          Custom (ms)
        </span>
        <input
          type="number"
          min={60_000}
          max={86_400_000}
          step={60_000}
          value={trigger.ms}
          onChange={(e) => {
            const ms = Number(e.target.value);
            if (Number.isFinite(ms) && ms >= 60_000 && ms <= 86_400_000) {
              onChange({ kind: "interval", ms });
            }
          }}
          className="px-2 py-1 rounded text-[11.5px] font-mono"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        />
      </label>
    </div>
  );
}

/* ─── Cron ───────────────────────────────────────────────────── */

const CRON_PRESETS: Array<{ label: string; expr: string }> = [
  { label: "Hourly", expr: "0 * * * *" },
  { label: "Daily 9am", expr: "0 9 * * *" },
  { label: "Mon noon", expr: "0 12 * * 1" },
  { label: "Monthly 1st", expr: "0 9 1 * *" },
];

function CronForm({
  trigger,
  onChange,
}: {
  trigger: Extract<TriggerDef, { kind: "cron" }>;
  onChange: (t: TriggerDef) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {CRON_PRESETS.map((p) => (
          <button
            key={p.expr}
            type="button"
            onClick={() => onChange({ kind: "cron", expr: p.expr })}
            className="px-2 py-1 rounded text-[11px] font-mono"
            style={{
              background: trigger.expr === p.expr ? "rgba(34,197,94,0.10)" : "rgba(15,23,42,0.04)",
              color: trigger.expr === p.expr ? "#15803D" : "#0A0A0A",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span
          className="font-mono uppercase tracking-[0.10em]"
          style={{ fontSize: 9, color: "#9CA3AF" }}
        >
          Cron expression (5-field, UTC)
        </span>
        <input
          type="text"
          value={trigger.expr}
          onChange={(e) => onChange({ kind: "cron", expr: e.target.value })}
          placeholder="0 * * * *"
          className="px-2 py-1.5 rounded text-[12px] font-mono"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        />
      </label>
      <p className="text-[10.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
        Format: minute hour day-of-month month day-of-week. All UTC.
      </p>
    </div>
  );
}

/* ─── Webhook ────────────────────────────────────────────────── */

function WebhookForm({
  trigger,
  onChange,
  agentId,
}: {
  trigger: Extract<TriggerDef, { kind: "webhook" }>;
  onChange: (t: TriggerDef) => void;
  agentId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" && agentId
      ? `${window.location.origin}/api/agents/${agentId}/webhook/${trigger.secret}`
      : `<save-first-to-get-the-url>`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
        Each POST to this URL fires one run. Body becomes <code className="font-mono text-[10px]">{"{{trigger.payload}}"}</code> in your steps.
      </p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 px-2 py-1.5 rounded font-mono text-[10.5px] truncate"
          style={{
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        >
          {url}
        </code>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
          className="px-2 py-1.5 rounded text-[11px] font-medium hover:bg-slate-100"
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      {copied && (
        <span className="text-[10.5px]" style={{ color: "#15803D" }}>
          Copied to clipboard
        </span>
      )}
      <button
        type="button"
        onClick={() => onChange({ kind: "webhook", secret: generateSecret() })}
        className="self-start px-2 py-1 rounded text-[10.5px] font-mono"
        style={{
          background: "rgba(15,23,42,0.04)",
          border: "1px solid rgba(15,23,42,0.10)",
          color: "#0A0A0A",
        }}
      >
        Rotate secret
      </button>
    </div>
  );
}

function generateSecret(): string {
  return randomUUID().replace(/-/g, "");
}
