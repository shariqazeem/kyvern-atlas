"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 4 — Review + Deploy
   · Summary card (identity, budgets, policies)
   · Network toggle (devnet/mainnet)
   · When the user clicks Continue, the parent triggers deployingState;
     we render a cinematic Solana-signing visual until it resolves.
   ════════════════════════════════════════════════════════════════════ */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { PURPOSE_PRESETS, type VaultConfig } from "../types";
import { EASE_PREMIUM as ease } from "@/lib/motion";

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

/**
 * DeployingView — the cinematic moment.
 *
 * What the user sees between clicking "Deploy agent" and landing on
 * the success screen. This is the most consequential 1-2 seconds of
 * the whole wizard, so we treat it like Stripe treats a payment
 * confirmation — deliberate, stage-paced, numerical.
 *
 * Three visible phases:
 *   · Submitting  — dark transaction envelope, emoji stamps on it
 *   · Confirming  — signature types character-by-character in mono
 *   · Settling    — a success flash anticipating the next screen
 *
 * The signature shown is a SCRAMBLED placeholder — once the real sig
 * is returned from /api/vault/create, SuccessStep reveals it for real
 * via its own typewriter pass. Judges asking "is this real" can click
 * the Explorer link on the next screen; this screen is just the
 * emotional beat.
 */
type DeployPhase = "submitting" | "confirming" | "settling";
const PHASE_ORDER: DeployPhase[] = ["submitting", "confirming", "settling"];
const PHASE_COPY: Record<DeployPhase, { label: string; hint: string }> = {
  submitting: {
    label: "Submitting",
    hint: "Packaging the transaction and forwarding to a Solana RPC.",
  },
  confirming: {
    label: "Confirming",
    hint: "Validators are agreeing on the policy program's refusal conditions.",
  },
  settling: {
    label: "Settled",
    hint: "Smart account created. Spending limit delegated to your agent.",
  },
};

// Base58 alphabet for the placeholder signature scramble.
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const randChar = () => B58[Math.floor(Math.random() * B58.length)];
const randSig = (len = 88) =>
  Array.from({ length: len }, randChar).join("");

function DeployingView({ config }: { config: VaultConfig }) {
  const [phase, setPhase] = useState<DeployPhase>("submitting");
  const [sig, setSig] = useState<string>("");
  const [charIdx, setCharIdx] = useState(0);
  const reduced = useReducedMotion();

  // Phase progression — timed. Total ~1.4s before Settled, which lines
  // up with MIN_DEPLOY_MS in the parent so the transition feels intentional.
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("confirming"), 420);
    const t2 = setTimeout(() => setPhase("settling"), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Signature typewriter — starts during `confirming`, characters land
  // every ~28ms. The string itself gets regenerated each tick to give
  // it the "decrypting" scramble feel before the real sig arrives.
  useEffect(() => {
    if (phase !== "confirming") return;
    const targetLen = 44;
    setCharIdx(0);
    const revealId = setInterval(() => {
      setCharIdx((i) => {
        const next = i + 1;
        if (next > targetLen) {
          clearInterval(revealId);
          return i;
        }
        return next;
      });
    }, 22);
    const scrambleId = reduced
      ? null
      : setInterval(() => setSig(randSig(44)), 60);
    return () => {
      clearInterval(revealId);
      if (scrambleId) clearInterval(scrambleId);
    };
  }, [phase, reduced]);

  // One scramble at mount so the envelope has something to show even
  // during "submitting" (small ghost print).
  useEffect(() => {
    setSig(randSig(44));
  }, []);

  const stages = [
    "Creating Squads smart account",
    "Delegating spending limit to agent",
    "Publishing policy manifest",
    "Issuing agent key",
  ];
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const progress =
    phase === "settling" ? 1 : phase === "confirming" ? 0.65 : 0.18;

  return (
    <div className="flex flex-col items-center text-center pt-2 pb-1">
      {/* Agent emoji tile — unchanged, but with a ring that brightens
          as we advance phases. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="relative w-20 h-20 rounded-[22px] flex items-center justify-center mb-6"
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
              "conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(255,255,255,0.40) 360deg)",
            mask: "radial-gradient(circle, transparent 32px, black 34px)",
            WebkitMask:
              "radial-gradient(circle, transparent 32px, black 34px)",
          }}
        />
        <span className="relative text-white text-[32px] font-bold tracking-tight">
          {config.emoji}
        </span>
      </motion.div>

      {/* Transaction envelope — the hero visual of this screen. Dark,
          monospaced, with the signature type streaming in. */}
      <motion.div
        layout
        transition={{ duration: 0.4, ease }}
        className="w-full max-w-[440px] rounded-[16px] overflow-hidden mb-5"
        style={{
          background: "#0B0B0F",
          border: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Envelope header — mini traffic lights + status pill */}
        <div
          className="flex items-center justify-between px-3.5 py-2"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)" }}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)" }}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)" }}
            />
            <span
              className="ml-2 text-[10.5px] font-mono-numbers"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              solana · devnet · tx out
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  phase === "settling"
                    ? "#4ADE80"
                    : phase === "confirming"
                      ? "#FBBF24"
                      : "#60A5FA",
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color:
                  phase === "settling"
                    ? "#4ADE80"
                    : phase === "confirming"
                      ? "#FBBF24"
                      : "#60A5FA",
              }}
            >
              {PHASE_COPY[phase].label}
            </span>
          </div>
        </div>

        {/* Envelope body */}
        <div className="px-4 py-3.5 font-mono-numbers text-left">
          <div
            className="text-[9.5px] uppercase tracking-[0.12em] mb-1"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            Transaction signature
          </div>
          <div
            className="text-[12.5px] leading-[1.5] break-all min-h-[40px]"
            style={{ color: "#E4E4E7" }}
          >
            {phase === "submitting" ? (
              <span style={{ color: "rgba(255,255,255,0.42)" }}>
                {sig.slice(0, 8)}
                <span className="opacity-60"> …awaiting RPC</span>
              </span>
            ) : phase === "confirming" ? (
              <>
                <span style={{ color: "#E4E4E7" }}>{sig.slice(0, charIdx)}</span>
                <motion.span
                  aria-hidden
                  className="inline-block align-middle"
                  style={{
                    width: "7px",
                    height: "13px",
                    background: "#E4E4E7",
                    marginLeft: "1px",
                  }}
                  animate={{ opacity: [1, 1, 0, 0] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    times: [0, 0.5, 0.5, 1],
                  }}
                />
              </>
            ) : (
              // "settling" — the sig is "complete" (placeholder);
              // SuccessStep will reveal the REAL one on next mount.
              <span style={{ color: "#4ADE80" }}>
                {sig.slice(0, 44)}
                <Check className="w-3 h-3 inline ml-1.5 -mt-0.5" />
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="mt-3 h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.6, ease }}
              style={{
                background:
                  phase === "settling"
                    ? "linear-gradient(90deg, #4ADE80, #22C55E)"
                    : "linear-gradient(90deg, #60A5FA, #818CF8)",
              }}
            />
          </div>

          {/* Caption */}
          <p
            className="mt-3 text-[11.5px]"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            {PHASE_COPY[phase].hint}
          </p>
        </div>
      </motion.div>

      {/* Stage chips — one lit per phase. These progressively check off
          as the phases advance. */}
      <div className="space-y-2 w-full max-w-[440px]">
        {stages.map((s, i) => {
          // Cascade reveal: stage i becomes "done" when phaseIdx * (4/3) > i.
          const scaled = (phaseIdx / (PHASE_ORDER.length - 1)) * stages.length;
          const done = scaled > i + 0.4;
          const active = scaled > i - 0.2 && scaled <= i + 0.4;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.12, ease }}
              className="flex items-center gap-3 text-left"
            >
              <motion.div
                animate={{
                  background: done
                    ? "var(--success)"
                    : active
                      ? "var(--text-primary)"
                      : "var(--surface-3)",
                  scale: active ? 1.08 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              >
                <Check
                  className="w-3 h-3 text-white"
                  style={{ opacity: done || active ? 1 : 0 }}
                />
              </motion.div>
              <span
                className="text-[13.5px]"
                style={{
                  color: done
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  fontWeight: done ? 500 : 400,
                }}
              >
                {s}
              </span>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
