"use client";

/**
 * LiveStateStrip — the single-line zoom-in of the home tile.
 *
 * /app's WorkerTile shows verb + outcome + Explorer pill in a vertical
 * tile. The detail page repeats that exact shape as a horizontal strip
 * directly below the chassis so the user never loses context: the
 * thing they tapped on the tile is the thing they see at the top of
 * the detail page, expanded.
 *
 * Same resolver logic as worker-tile.tsx but laid out horizontally.
 * Reuses the same WorkerTileWorker / WorkerTileAction shapes for
 * consistency — when the home tile gets a fix, this surface gets it
 * too.
 */

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Check, X } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface LiveStateAction {
  id: string;
  timestamp: number;
  tool: string;
  amountUsd: number | null;
  signature: string | null;
  signatureStatus: "success" | "failed" | null;
  counterparty: string | null;
  message: string | null;
  brand?: string | null;
}

export interface LiveStateFinding {
  kind: string;
  subject: string;
  brand: string | null;
  ts: number;
}

interface Props {
  action: LiveStateAction | null;
  finding: LiveStateFinding | null;
  network: "devnet" | "mainnet";
}

export function LiveStateStrip({ action, finding, network }: Props) {
  const verb = resolveVerb(action, finding);
  const outcome = resolveOutcome(action);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-[14px] px-4 py-3.5 mb-4"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* LEFT — eyebrow + verb */}
        <div className="min-w-0 flex-1">
          <div
            className="font-mono uppercase tracking-[0.16em] mb-1"
            style={{
              color: "#9CA3AF",
              fontSize: 9.5,
            }}
          >
            Live state
          </div>
          <div
            className="text-[14px] leading-[1.4]"
            style={{ color: "#0A0A0A", letterSpacing: "-0.005em" }}
          >
            {verb}
          </div>
        </div>

        {/* CENTER — outcome badge */}
        <AnimatePresence mode="wait">
          {outcome && (
            <motion.div
              key={outcome.text}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <OutcomeBadge outcome={outcome} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT — Explorer pill */}
        {action?.signature && (
          <a
            href={`https://explorer.solana.com/tx/${action.signature}?cluster=${network}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono rounded-full px-2.5 py-1 hover:opacity-90 transition shrink-0"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.04em",
              color: "#15803D",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            {action.signature.slice(0, 5)}…{action.signature.slice(-4)}
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

function OutcomeBadge({
  outcome,
}: {
  outcome: { tone: "approved" | "blocked" | "pending"; text: string };
}) {
  const palette =
    outcome.tone === "approved"
      ? { fg: "#15803D", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.22)" }
      : outcome.tone === "blocked"
        ? { fg: "#B45309", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" }
        : { fg: "#475569", bg: "rgba(15,23,42,0.04)", border: "rgba(15,23,42,0.10)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono rounded-[8px] px-2.5 py-1 shrink-0"
      style={{
        fontSize: 11,
        letterSpacing: "0.01em",
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      {outcome.tone === "approved" ? (
        <Check className="w-3 h-3" strokeWidth={2.5} />
      ) : outcome.tone === "blocked" ? (
        <X className="w-3 h-3" strokeWidth={2.5} />
      ) : null}
      {outcome.text}
    </span>
  );
}

function resolveVerb(
  action: LiveStateAction | null,
  finding: LiveStateFinding | null,
): string {
  if (!action) {
    if (finding) {
      const brand = finding.brand;
      const subj = compressSubject(finding.subject);
      switch (finding.kind) {
        case "opportunity":
        case "bounty":
          return brand
            ? `Found a ${brand} bounty${subj ? ` — ${subj}` : ""}`
            : subj
              ? `Found ${subj}`
              : "Found an opportunity";
        case "github_release":
          return brand ? `Spotted ${brand} release` : "Spotted a release";
        case "ecosystem_announcement":
          return brand
            ? `Spotted ${brand} announcement`
            : "Spotted an ecosystem move";
        case "wallet_move":
          return "Flagged a whale move";
        case "market_intel":
          return "Flagged market intel";
        case "price_trigger":
          return "Triggered on price";
        default:
          return subj ? `Logged: ${subj}` : "Logged an observation";
      }
    }
    return "Standing by — waiting for the next tick.";
  }

  const brand = action.brand ?? null;
  const failed = action.signatureStatus === "failed";

  switch (action.tool) {
    case "post_task":
      return failed
        ? brand
          ? `Tried to post a ${brand} task`
          : "Tried to post a paid task"
        : brand
          ? `Posted a ${brand} task`
          : "Posted a paid task";
    case "claim_task":
      return failed
        ? brand
          ? `Tried to claim a ${brand} task`
          : "Tried to claim a paid task"
        : brand
          ? `Claimed a ${brand} task`
          : "Claimed a paid task";
    case "complete_task":
      return failed
        ? brand
          ? `Tried to complete a ${brand} task`
          : "Tried to complete a paid task"
        : brand
          ? `Completed a ${brand} task`
          : "Completed a paid task";
    case "stake_on_finding":
      return failed ? "Tried to stake" : "Staked on a finding";
    case "subscribe_to_agent":
      return failed ? "Tried to pay another worker" : "Paid another worker";
    default:
      return action.tool.replace(/_/g, " ");
  }
}

function resolveOutcome(
  action: LiveStateAction | null,
): { tone: "approved" | "blocked" | "pending"; text: string } | null {
  if (!action) return null;
  const amt = action.amountUsd != null ? action.amountUsd : 0;
  const amtStr = amt > 0 ? `$${amt.toFixed(2)}` : "";

  if (action.signatureStatus === "failed") {
    const reason = compressReason(action.message);
    return {
      tone: "blocked",
      text: reason
        ? amtStr
          ? `Attempted ${amtStr} → Blocked (${reason})`
          : `Blocked (${reason})`
        : amtStr
          ? `Attempted ${amtStr} → Blocked by chain`
          : "Blocked by chain",
    };
  }
  if (action.signatureStatus === "success") {
    if (action.tool === "stake_on_finding") {
      return { tone: "approved", text: `Staked ${amtStr || "—"} → Settled` };
    }
    if (action.tool === "complete_task") {
      return { tone: "approved", text: `Earned ${amtStr || "—"} → Settled` };
    }
    return { tone: "approved", text: `Spent ${amtStr || "—"} → Approved` };
  }
  return {
    tone: "pending",
    text: amt > 0 ? `Trying ${amtStr}…` : "Trying…",
  };
}

function compressReason(message: string | null): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (
    m.includes("no record of a prior credit") ||
    m.includes("insufficient funds") ||
    m.includes("insufficient balance") ||
    m.includes("balance too low") ||
    m.includes("not enough usdc") ||
    m.includes("insufficient")
  )
    return "low balance";
  if (
    m.includes("fee payer") ||
    m.includes("no sol") ||
    m.includes("not enough sol") ||
    m.includes("blockhash not found")
  )
    return "no fee gas";
  if (m.includes("daily cap") || m.includes("daily limit")) return "daily cap";
  if (m.includes("weekly cap") || m.includes("weekly limit")) return "weekly cap";
  if (
    m.includes("spending limit exceeded") ||
    m.includes("limit exceeded") ||
    m.includes("daily")
  )
    return "daily cap";
  if (m.includes("per-tx") || m.includes("max per tx") || m.includes("per tx max"))
    return "per-tx cap";
  if (m.includes("velocity") || m.includes("rate limit")) return "rate limit";
  if (m.includes("merchant") || m.includes("allowlist")) return "merchant blocked";
  if (m.includes("memo")) return "memo missing";
  if (m.includes("paused") || m.includes("kill")) return "kill switch";
  return null;
}

function compressSubject(s: string): string {
  if (!s) return "";
  const cut = s.split(/\s[—·]\s/)[0];
  return cut.length > 60 ? `${cut.slice(0, 58)}…` : cut;
}
