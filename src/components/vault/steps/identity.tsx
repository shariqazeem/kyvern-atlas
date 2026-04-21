"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 1 — Identity
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { PURPOSE_PRESETS, type AgentPurpose, type VaultConfig } from "../types";

const ease = [0.25, 0.1, 0.25, 1] as const;

export interface IdentityStepProps {
  config: VaultConfig;
  setConfig: (updater: (c: VaultConfig) => VaultConfig) => void;
}

export function IdentityStep({ config, setConfig }: IdentityStepProps) {
  return (
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
          A name you&apos;ll recognize at 3am when your agent is still running.
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
                  background: selected ? "var(--surface)" : "var(--surface-2)",
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
  );
}
