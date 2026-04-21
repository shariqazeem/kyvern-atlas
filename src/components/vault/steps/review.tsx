"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 4 — Review + Deploy
   · Summary card (identity, budgets, policies)
   · Network toggle (devnet/mainnet)
   · When the user clicks Continue, the parent triggers deployingState;
     we render a Squads-style signature visual until it resolves.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Check, ShieldCheck } from "lucide-react";
import { PURPOSE_PRESETS, type VaultConfig } from "../types";

const ease = [0.25, 0.1, 0.25, 1] as const;

export interface ReviewStepProps {
  config: VaultConfig;
  setConfig: (updater: (c: VaultConfig) => VaultConfig) => void;
  isDeploying: boolean;
}

export function ReviewStep({
  config,
  setConfig,
  isDeploying,
}: ReviewStepProps) {
  if (isDeploying) {
    return <DeployingView config={config} />;
  }

  const purpose = PURPOSE_PRESETS[config.purpose];
  const velocityLabel =
    config.velocityWindow === "1h"
      ? "per hour"
      : config.velocityWindow === "1d"
        ? "per day"
        : "per week";

  return (
    <div className="space-y-6">
      {/* Vault card */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="p-5 flex items-center gap-4"
          style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
        >
          <div
            className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[24px] shrink-0"
            style={{ background: "var(--surface-2)" }}
          >
            {config.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[16px] font-semibold mb-0.5 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {config.name || "Untitled agent"}
            </div>
            <div
              className="text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {purpose.label} · Solana {config.network}
            </div>
          </div>
        </div>

        <Row label="Daily cap">
          <Money value={config.dailyLimit} />
        </Row>
        <Row label="Weekly ceiling">
          <Money value={config.weeklyLimit} />
        </Row>
        <Row label="Per-tx max">
          <Money value={config.perTxMax} />
        </Row>
        <Row label="Velocity">
          <span className="font-mono-numbers tabular-nums">
            {config.maxCallsPerWindow} calls {velocityLabel}
          </span>
        </Row>
        <Row label="Require memo">
          <span>{config.requireMemo ? "Yes" : "No"}</span>
        </Row>
        <Row label="Merchants" last>
          {config.allowedMerchants.length === 0 ? (
            <span style={{ color: "var(--warning)" }}>
              Any host (unrestricted)
            </span>
          ) : (
            <div className="flex flex-wrap justify-end gap-1.5 max-w-[260px]">
              {config.allowedMerchants.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="text-[12px] font-mono-numbers px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-secondary)",
                    border: "0.5px solid var(--border)",
                  }}
                >
                  {m}
                </span>
              ))}
              {config.allowedMerchants.length > 3 && (
                <span
                  className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  +{config.allowedMerchants.length - 3}
                </span>
              )}
            </div>
          )}
        </Row>
      </div>

      {/* Network selector */}
      <div>
        <label
          className="text-[13px] font-medium mb-2 block"
          style={{ color: "var(--text-primary)" }}
        >
          Network
        </label>
        <div
          className="grid grid-cols-2 gap-2 p-1 rounded-[12px]"
          style={{ background: "var(--surface-2)" }}
        >
          {(["devnet", "mainnet"] as const).map((n) => {
            const selected = config.network === n;
            return (
              <button
                key={n}
                onClick={() => setConfig((c) => ({ ...c, network: n }))}
                className="relative h-10 rounded-[10px] text-[13.5px] font-semibold transition-colors"
                style={{
                  color: selected
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                }}
              >
                {selected && (
                  <motion.div
                    layoutId="network-pill"
                    className="absolute inset-0 rounded-[10px]"
                    style={{
                      background: "var(--surface)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                    transition={{ duration: 0.3, ease }}
                  />
                )}
                <span className="relative">
                  {n === "devnet" ? "Devnet · free" : "Mainnet · live"}
                </span>
              </button>
            );
          })}
        </div>
        <p
          className="mt-2 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Graduate your agent from devnet to mainnet any time — same program, real funds.
        </p>
      </div>

      {/* Security note */}
      <div
        className="flex gap-3 p-4 rounded-[14px]"
        style={{
          background: "var(--surface-2)",
          border: "0.5px solid var(--border-subtle)",
        }}
      >
        <ShieldCheck
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        />
        <p
          className="text-[13px] leading-[1.55]"
          style={{ color: "var(--text-secondary)" }}
        >
          Deploy creates a Squads v4 smart account and delegates a spending
          limit to the agent. Custody stays with you. Squads has been audited
          by Trail of Bits, OtterSec, and Neodyme, and secures over $10B on
          Solana.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="px-5 py-3.5 flex items-center justify-between gap-4"
      style={
        last ? undefined : { borderBottom: "0.5px solid var(--border-subtle)" }
      }
    >
      <span
        className="text-[13px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {children}
      </span>
    </div>
  );
}

function Money({ value }: { value: number }) {
  return (
    <span className="font-mono-numbers tabular-nums">
      ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
      <span
        className="text-[11px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        USDC
      </span>
    </span>
  );
}

/* ─── Deploying view ─── */

function DeployingView({ config }: { config: VaultConfig }) {
  const stages = [
    "Creating Squads smart account…",
    "Delegating spending limit to agent…",
    "Publishing policy manifest…",
    "Issuing agent key…",
  ];

  return (
    <div className="flex flex-col items-center text-center pt-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease }}
        className="relative w-20 h-20 rounded-[22px] flex items-center justify-center mb-8"
        style={{
          background: "var(--text-primary)",
          boxShadow:
            "0 4px 8px rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-6px] rounded-[26px]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(255,255,255,0.35) 360deg)",
            mask: "radial-gradient(circle, transparent 32px, black 34px)",
            WebkitMask:
              "radial-gradient(circle, transparent 32px, black 34px)",
          }}
        />
        <span className="relative text-white text-[32px] font-bold tracking-tight">
          {config.emoji}
        </span>
      </motion.div>

      <div className="space-y-2.5 w-full max-w-sm">
        {stages.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.35, ease }}
            className="flex items-center gap-3 text-left"
          >
            <motion.div
              initial={{ background: "var(--surface-3)" }}
              animate={{ background: "var(--text-primary)" }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.35 }}
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
            <span
              className="text-[13.5px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {s}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
