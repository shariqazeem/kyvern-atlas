"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 1 — Identity

   Two columns on desktop, stacked on mobile:

     LEFT                          RIGHT
     · Agent name input            · Live "agent nameplate" card —
     · Purpose picker (6 chips)      renders as the user types, so the
                                     config feels like character design,
                                     not form-fill.

   The nameplate mirrors the visual language of the /vault/[id] header
   row so when the user finally deploys, the card they've been shaping
   materializes 1:1 in their dashboard. "You designed this, and it's
   now live" is a stronger outcome than "your vault is ready."
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { PURPOSE_PRESETS, type AgentPurpose, type VaultConfig } from "../types";
import { EASE_PREMIUM as ease } from "@/lib/motion";

export interface IdentityStepProps {
  config: VaultConfig;
  setConfig: (updater: (c: VaultConfig) => VaultConfig) => void;
}

export function IdentityStep({ config, setConfig }: IdentityStepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-8">
      {/* LEFT — form */}
      <div className="space-y-8">
        {/* Agent name */}
        <div>
          <label
            htmlFor="vault-name"
            className="text-[13px] font-medium mb-2.5 block"
            style={{ color: "var(--text-primary)" }}
          >
            Agent name
          </label>
          <div
            className="relative flex items-center rounded-[14px] overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "border-color 200ms var(--ease-premium)",
            }}
          >
            <div
              className="ml-2 my-2 w-11 h-11 rounded-[10px] flex items-center justify-center text-[22px] shrink-0"
              style={{ background: "var(--surface-2)" }}
            >
              {config.emoji}
            </div>
            <input
              id="vault-name"
              autoFocus
              value={config.name}
              onChange={(e) =>
                setConfig((c) => ({ ...c, name: e.target.value }))
              }
              placeholder="Research agent · v1"
              className="flex-1 bg-transparent px-3 py-4 text-[17px] outline-none"
              style={{ color: "var(--text-primary)" }}
              maxLength={40}
            />
            <span
              className="mr-4 text-[12px] font-mono-numbers tabular-nums"
              style={{ color: "var(--text-quaternary)" }}
            >
              {config.name.length}/40
            </span>
          </div>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            A name you&apos;ll recognize at 3am when your agent is still
            running.
          </p>
        </div>

        {/* Purpose grid */}
        <div>
          <label
            className="text-[13px] font-medium mb-3 block"
            style={{ color: "var(--text-primary)" }}
          >
            What will this agent do?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(Object.keys(PURPOSE_PRESETS) as AgentPurpose[]).map((key, i) => {
              const preset = PURPOSE_PRESETS[key];
              const selected = config.purpose === key;
              return (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.05 + i * 0.04,
                    ease,
                  }}
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      purpose: key,
                      emoji: preset.emoji,
                    }))
                  }
                  className="group text-left p-4 rounded-[14px] relative"
                  style={{
                    background: selected
                      ? "var(--surface)"
                      : "var(--surface-2)",
                    border: selected
                      ? "0.5px solid var(--text-primary)"
                      : "0.5px solid transparent",
                    boxShadow: selected
                      ? "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)"
                      : "none",
                    transition: "all 250ms var(--ease-premium)",
                  }}
                >
                  <div className="text-[22px] mb-2.5">{preset.emoji}</div>
                  <div
                    className="text-[13.5px] font-semibold mb-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {preset.label}
                  </div>
                  <div
                    className="text-[12px] leading-[1.4]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {preset.description}
                  </div>
                  {selected && (
                    <motion.div
                      layoutId="identity-ring"
                      className="absolute inset-0 rounded-[14px] pointer-events-none"
                      style={{
                        boxShadow:
                          "inset 0 0 0 1px var(--text-primary)",
                      }}
                      transition={{ duration: 0.3, ease }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — live nameplate preview */}
      <LiveNameplate config={config} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Live nameplate — mirrors the dashboard header the user will
   eventually see on /vault/[id]. Re-renders on every keystroke.
   ──────────────────────────────────────────────────────────────── */

function LiveNameplate({ config }: { config: VaultConfig }) {
  const preset = PURPOSE_PRESETS[config.purpose];
  const name = config.name.trim() || "Unnamed agent";
  const readyness = config.name.trim().length >= 2;
  return (
    <aside className="sticky md:top-28 h-fit">
      <div
        className="rounded-[18px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.15)",
        }}
      >
        {/* Browser-chrome strip echoing the observatory language */}
        <div
          className="flex items-center gap-1.5 px-4 py-2"
          style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-red)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-yellow)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-green)" }}
          />
          <span
            className="ml-2 text-[10px] font-mono-numbers"
            style={{ color: "var(--text-quaternary)" }}
          >
            preview
          </span>
          <span className="ml-auto flex items-center gap-1">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: readyness
                  ? "var(--success)"
                  : "var(--text-quaternary)",
              }}
              animate={readyness ? { opacity: [0.5, 1, 0.5] } : undefined}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span
              className="text-[9.5px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color: readyness
                  ? "var(--success-deep)"
                  : "var(--text-tertiary)",
              }}
            >
              {readyness ? "ready" : "naming…"}
            </span>
          </span>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              key={config.emoji}
              initial={{ scale: 0.85, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease }}
              className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[26px] shrink-0"
              style={{ background: "var(--surface-2)" }}
            >
              {config.emoji}
            </motion.div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--text-quaternary)" }}
              >
                Your autonomous agent
              </p>
              <motion.h3
                key={name}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease }}
                className="text-[16px] font-semibold tracking-[-0.015em] truncate"
                style={{
                  color: readyness
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  fontStyle: readyness ? "normal" : "italic",
                }}
              >
                {name}
              </motion.h3>
            </div>
          </div>

          {/* Purpose chip */}
          <div
            className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold"
            style={{
              background: "var(--agent-bg)",
              color: "var(--agent)",
            }}
          >
            <span>{preset.emoji}</span>
            {preset.label}
          </div>
          <p
            className="mt-3 text-[12px] leading-[1.5]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {preset.description}
          </p>

          {/* Placeholder footer (the live observatory once it's running) */}
          <div
            className="mt-5 pt-4 flex items-center justify-between text-[11px] font-mono-numbers"
            style={{
              borderTop: "0.5px solid var(--border-subtle)",
              color: "var(--text-quaternary)",
            }}
          >
            <span>uptime · waiting</span>
            <span>0 payments</span>
          </div>
        </div>
      </div>
      <p
        className="mt-3 text-[11px] leading-[1.5]"
        style={{ color: "var(--text-quaternary)" }}
      >
        This is how your agent will appear on the dashboard after deploy.
      </p>
    </aside>
  );
}
