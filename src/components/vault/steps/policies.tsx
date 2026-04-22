"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 3 — Policies

   Two columns on desktop:

     LEFT                          RIGHT
     · Allowlist editor            · Live "policy wall" card —
     · Velocity cap                  chip garden of allow-listed
     · Memo requirement              merchants, velocity bucket
                                     filling to scale, memo
                                     indicator. Mirrors the dashboard
                                     Policy tab 1:1.

   The preview signals: "these rules WILL be enforced on-chain, here's
   what they'll look like to your future self."
   ════════════════════════════════════════════════════════════════════ */

import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, ShieldAlert, Timer, X } from "lucide-react";
import { useState } from "react";
import type { VaultConfig, VelocityWindow } from "../types";
import { EASE_PREMIUM as ease } from "@/lib/motion";
import { WizardPreviewDrawer } from "../wizard-preview-drawer";

const WINDOW_OPTIONS: { value: VelocityWindow; label: string }[] = [
  { value: "1h", label: "per hour" },
  { value: "1d", label: "per day" },
  { value: "1w", label: "per week" },
];

const SUGGESTED_MERCHANTS = [
  "api.openai.com",
  "api.anthropic.com",
  "api.perplexity.ai",
  "weather-api.example.com",
];

export interface PoliciesStepProps {
  config: VaultConfig;
  setConfig: (updater: (c: VaultConfig) => VaultConfig) => void;
}

export function PoliciesStep({ config, setConfig }: PoliciesStepProps) {
  const [draft, setDraft] = useState("");

  const addMerchant = (raw: string) => {
    const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (!host) return;
    if (config.allowedMerchants.includes(host)) {
      setDraft("");
      return;
    }
    setConfig((c) => ({
      ...c,
      allowedMerchants: [...c.allowedMerchants, host],
    }));
    setDraft("");
  };

  const removeMerchant = (host: string) =>
    setConfig((c) => ({
      ...c,
      allowedMerchants: c.allowedMerchants.filter((m) => m !== host),
    }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-8">
      {/* LEFT — editable policy form */}
      <div className="space-y-8">
        {/* Merchant allowlist */}
        <div>
          <label
            className="text-[13px] font-medium mb-2.5 block"
            style={{ color: "var(--text-primary)" }}
          >
            Merchant allowlist
          </label>
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Only these hosts can receive payments. Everything else is refused.
            Leave empty to allow any host (not recommended).
          </p>

          <div
            className="rounded-[14px] overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center px-4 py-3">
              <span
                className="text-[13px] mr-3 font-mono-numbers"
                style={{ color: "var(--text-quaternary)" }}
              >
                https://
              </span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMerchant(draft);
                  }
                }}
                placeholder="weather-api.example.com"
                className="flex-1 bg-transparent text-[15px] outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={() => addMerchant(draft)}
                disabled={!draft.trim()}
                className="ml-3 inline-flex items-center gap-1 h-9 px-3 rounded-[10px] text-[13px] font-semibold transition-all"
                style={{
                  background: draft.trim()
                    ? "var(--text-primary)"
                    : "var(--surface-2)",
                  color: draft.trim()
                    ? "var(--background)"
                    : "var(--text-quaternary)",
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {config.allowedMerchants.length > 0 && (
              <div
                className="px-4 py-3 flex flex-wrap gap-2"
                style={{ borderTop: "0.5px solid var(--border-subtle)" }}
              >
                <AnimatePresence initial={false}>
                  {config.allowedMerchants.map((host) => (
                    <motion.div
                      key={host}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25, ease }}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 h-7 rounded-full font-mono-numbers"
                      style={{
                        background: "var(--surface-2)",
                        border: "0.5px solid var(--border)",
                      }}
                    >
                      <span
                        className="text-[12.5px]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {host}
                      </span>
                      <button
                        onClick={() => removeMerchant(host)}
                        className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                        style={{ color: "var(--text-tertiary)" }}
                        aria-label={`Remove ${host}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className="text-[12px] mr-1"
              style={{ color: "var(--text-quaternary)" }}
            >
              Suggestions:
            </span>
            {SUGGESTED_MERCHANTS.filter(
              (m) => !config.allowedMerchants.includes(m),
            ).map((m) => (
              <button
                key={m}
                onClick={() => addMerchant(m)}
                className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11.5px] font-mono-numbers transition-colors"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "0.5px solid var(--border-subtle)",
                }}
              >
                + {m}
              </button>
            ))}
          </div>
        </div>

        {/* Velocity cap */}
        <div>
          <label
            className="text-[13px] font-medium mb-2.5 block"
            style={{ color: "var(--text-primary)" }}
          >
            Velocity cap
          </label>
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Stops runaway loops cold.
          </p>
          <div
            className="flex items-center gap-3 p-4 rounded-[14px]"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <span
              className="text-[17px]"
              style={{ color: "var(--text-secondary)" }}
            >
              No more than
            </span>
            <input
              type="number"
              min={1}
              value={config.maxCallsPerWindow}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  maxCallsPerWindow: Math.max(1, Number(e.target.value) || 1),
                }))
              }
              className="w-20 text-center bg-transparent text-[20px] font-semibold font-mono-numbers tabular-nums outline-none rounded-[10px] py-1.5"
              style={{
                color: "var(--text-primary)",
                border: "0.5px solid var(--border)",
                background: "var(--surface-2)",
              }}
            />
            <span
              className="text-[17px]"
              style={{ color: "var(--text-secondary)" }}
            >
              calls
            </span>
            <select
              value={config.velocityWindow}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  velocityWindow: e.target.value as VelocityWindow,
                }))
              }
              className="text-[15px] font-medium bg-transparent rounded-[10px] px-3 py-1.5 outline-none cursor-pointer"
              style={{
                color: "var(--text-primary)",
                border: "0.5px solid var(--border)",
                background: "var(--surface-2)",
              }}
            >
              {WINDOW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Require memo */}
        <label
          className="flex items-start gap-3 p-4 rounded-[14px] cursor-pointer"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div
            className="relative mt-0.5 w-10 h-6 rounded-full transition-colors duration-200 shrink-0"
            style={{
              background: config.requireMemo
                ? "var(--text-primary)"
                : "var(--surface-3)",
            }}
          >
            <input
              type="checkbox"
              checked={config.requireMemo}
              onChange={(e) =>
                setConfig((c) => ({ ...c, requireMemo: e.target.checked }))
              }
              className="sr-only"
            />
            <motion.div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
              animate={{ x: config.requireMemo ? 18 : 2 }}
              transition={{ duration: 0.25, ease }}
            />
          </div>
          <div>
            <div
              className="text-[14px] font-semibold mb-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              Require memo on every payment
            </div>
            <div
              className="text-[13px] leading-[1.45]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Agents must state why they&apos;re paying. Shows up in your
              audit log. Pairs well with anomaly alerts.
            </div>
          </div>
        </label>
      </div>

      {/* RIGHT — live policy wall. Mobile: drawer. */}
      <WizardPreviewDrawer label="Policy wall">
        <LivePolicyWall config={config} />
      </WizardPreviewDrawer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Live policy wall — mirrors the /vault/[id] Policy tab's chip
   garden + velocity bucket so the user sees exactly what the
   dashboard will show once deployed.
   ──────────────────────────────────────────────────────────────── */

function LivePolicyWall({ config }: { config: VaultConfig }) {
  const windowLabel =
    config.velocityWindow === "1h"
      ? "every hour"
      : config.velocityWindow === "1d"
        ? "every day"
        : "every week";
  return (
    <aside className="sticky md:top-28 h-fit space-y-3">
      {/* Chip garden */}
      <div
        className="rounded-[16px] p-4"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <ShieldAlert
            className="w-3 h-3"
            style={{ color: "var(--agent)" }}
          />
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--agent)" }}
          >
            Allowlist preview
          </p>
          <span
            className="ml-auto text-[10px] font-mono-numbers"
            style={{ color: "var(--text-quaternary)" }}
          >
            {config.allowedMerchants.length}{" "}
            merchant{config.allowedMerchants.length === 1 ? "" : "s"}
          </span>
        </div>
        {config.allowedMerchants.length === 0 ? (
          <p
            className="text-[11.5px] leading-[1.5]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Add merchants on the left — they&apos;ll appear here as chips.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {config.allowedMerchants.map((m, i) => (
              <motion.span
                key={m}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.025, ease }}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-mono-numbers"
                style={{
                  background: "var(--agent-bg)",
                  color: "var(--agent)",
                  border: "0.5px solid rgba(79,70,229,0.15)",
                }}
              >
                <Check className="w-2.5 h-2.5" />
                {m}
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* Velocity bucket — a visual metaphor for "the agent can fill this much". */}
      <div
        className="rounded-[16px] p-4"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Timer className="w-3 h-3" style={{ color: "var(--agent)" }} />
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--agent)" }}
          >
            Velocity ceiling
          </p>
        </div>
        <div className="flex items-end gap-3">
          <p
            className="text-[32px] font-semibold leading-none tracking-tight"
            style={{
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {config.maxCallsPerWindow}
          </p>
          <p
            className="pb-1 text-[11.5px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            calls
            <br />
            {windowLabel}
          </p>
        </div>
      </div>

      {/* Memo indicator */}
      <div
        className="rounded-[16px] p-4 flex items-center gap-3"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: config.requireMemo
              ? "var(--success-bg)"
              : "var(--surface-2)",
          }}
        >
          <Check
            className="w-4 h-4"
            style={{
              color: config.requireMemo
                ? "var(--success-deep)"
                : "var(--text-quaternary)",
              opacity: config.requireMemo ? 1 : 0.5,
            }}
          />
        </div>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Memo requirement
          </p>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {config.requireMemo ? "Required" : "Optional"}
          </p>
        </div>
      </div>

      <p
        className="text-[11px] leading-[1.5]"
        style={{ color: "var(--text-quaternary)" }}
      >
        Rules land as a PDA on Solana. Kyvern reads, Squads enforces.
      </p>
    </aside>
  );
}
