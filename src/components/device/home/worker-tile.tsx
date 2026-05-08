"use client";

/**
 * WorkerTile — the protagonist of the /app Live Engine.
 *
 * One vertical tile per worker (Sentinel · Wren · Pulse). Each tile
 * tells the judge in five seconds:
 *
 *   1. The worker is alive (status LED, idle / thinking / acting)
 *   2. What it just tried to do (verb, with sponsor brand when present)
 *   3. Whether the chain approved or blocked it (outcome line — the
 *      tension that turns a dashboard into a Live Engine)
 *   4. A one-tap link to the real Solana signature (Explorer pill)
 *   5. A one-tap zoom into the worker's full thought feed (tap anywhere)
 *
 * Data: a single `actionFeedItem` filtered upstream from the action
 * feed — first entry that matches this worker's id. When a worker has
 * no recent action in the feed window, we fall back to the static
 * worker meta (totalEarnedUsd, totalThoughts) so the tile is never
 * blank.
 *
 * One tile shape, three workers' worth of stories. The chain is the
 * antagonist; the green vs red on the outcome line makes that visible.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, X } from "lucide-react";
import { WorkerEmoji } from "@/components/icons/worker-emoji";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface WorkerTileWorker {
  id: string;
  name: string;
  emoji: string;
  template: string;
  isThinking: boolean;
  totalThoughts: number;
  totalEarnedUsd: number;
  /** Live Engine — most recent signal this worker emitted. Sentinel's
   *  watch_url scans surface here even though they never hit the
   *  actionFeed (signals != economic tools). */
  lastFinding?: {
    kind: string;
    subject: string;
    brand: string | null;
    ts: number;
  } | null;
  /** Phase 4 — server-computed user-benefit subtitle. Reads as
   *  "2 drafts ready" / "3 alerts · last 14m ago" / "1 trigger armed",
   *  not internal verbs. */
  userOutcome?: string | null;
  /** Phase 6 (Frontier Grand Champion) — TUNE badge gates on this.
   *  False = worker is on starter defaults; the chip shows a TUNE pill
   *  until the owner saves any config change. */
  personalized?: boolean;
}

export interface WorkerTileAction {
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

interface Props {
  worker: WorkerTileWorker;
  /** Most recent action_feed row that belongs to this worker. */
  action: WorkerTileAction | null;
  network: "devnet" | "mainnet";
  /** Optional shorthand for a sponsor brand resolved upstream. */
  fallbackBrand?: string | null;
  /** When true, renders a small "DEMO" pill on the tile. The three
   *  trio workers seeded by /unbox are demos. User-deployed workers
   *  are not. The pill kills the marketplace-confusion problem in
   *  half a second of judge attention. */
  isDemo?: boolean;
}

/* ────────────────────────────────────────────────────────────────────
   Tile
   ──────────────────────────────────────────────────────────────────── */

export function WorkerTile({ worker, action, network, fallbackBrand, isDemo }: Props) {
  const status = resolveStatus(worker, action);
  const verb = resolveVerb(worker, action, fallbackBrand);
  const outcome = resolveOutcome(worker, action);

  return (
    <Link
      href={`/app/agents/${worker.id}`}
      className="group relative flex flex-col rounded-[16px] overflow-hidden no-underline"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* STARTER ribbon — top-right corner. The trio is pre-installed
          on every device by /unbox; they're real workers running under
          the policy program, not synthetic props. The pill says
          "starter" so the judge understands these came with the box —
          and that they can deploy their own alongside. */}
      {isDemo && (
        <span
          className="absolute font-mono uppercase tracking-[0.18em] rounded-[6px]"
          style={{
            top: 8,
            right: 8,
            fontSize: 8.5,
            padding: "2px 6px",
            color: "#15803D",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
            zIndex: 1,
          }}
        >
          Starter
        </span>
      )}

      {/* HERO — visual emoji + status. Bigger than before so a
          newbie's eye lands here first. */}
      <div className="px-5 pt-5 pb-2 flex items-start justify-between">
        <div
          className="rounded-[16px] flex items-center justify-center flex-shrink-0"
          style={{
            width: 56,
            height: 56,
            background:
              "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04), 0 8px 22px -10px rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        >
          <WorkerEmoji emoji={worker.emoji} size={28} strokeWidth={1.6} />
        </div>
        <StatusLED kind={status} />
      </div>

      {/* IDENTITY */}
      <div className="px-5 pt-3 pb-1.5">
        <div
          className="text-[17px] font-semibold tracking-[-0.01em]"
          style={{ color: "#0A0A0A" }}
        >
          {worker.name}
        </div>
      </div>

      {/* VERB — what they're doing now (subtle, supports the outcome) */}
      <div className="px-5 pb-3 flex flex-col gap-2.5 flex-1">
        <div
          className="text-[13px] leading-[1.45]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          {verb}
        </div>
        {/* OUTCOME — the STAR. Bigger, bolder, the moat moment. */}
        <OutcomeLine outcome={outcome} />
      </div>

      {/* TX FOOTER — quiet, single line. Labels the receipt as
          "Last settled" so the judge reads the row as proof, not
          mystery hex. */}
      {action?.signature ? (
        <a
          href={`https://explorer.solana.com/tx/${action.signature}?cluster=${network}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between px-5 py-2.5"
          style={{
            borderTop: "1px solid rgba(15,23,42,0.05)",
            background: "rgba(15,23,42,0.02)",
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.40)" }}
          >
            Last settled
          </span>
          <span
            className="font-mono inline-flex items-center gap-1"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.04em",
              color: "#15803D",
            }}
          >
            {action.signature.slice(0, 6)}…{action.signature.slice(-4)}
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </span>
        </a>
      ) : (
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{
            borderTop: "1px solid rgba(15,23,42,0.05)",
            background: "rgba(15,23,42,0.02)",
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.40)" }}
          >
            Live log
          </span>
          <span
            className="font-mono uppercase tracking-[0.14em] inline-flex items-center gap-1"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            View full log
            <ArrowUpRight
              className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              strokeWidth={2}
            />
          </span>
        </div>
      )}
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────────────── */

type StatusKind = "acting" | "thinking" | "idle" | "blocked";

function StatusLED({ kind }: { kind: StatusKind }) {
  const colour =
    kind === "acting"
      ? "#22C55E"
      : kind === "blocked"
        ? "#F59E0B"
        : kind === "thinking"
          ? "#22C55E"
          : "rgba(15,23,42,0.20)";
  const label =
    kind === "acting"
      ? "Acting"
      : kind === "blocked"
        ? "Blocked"
        : kind === "thinking"
          ? "Thinking"
          : "Idle";
  return (
    <div className="flex items-center gap-1.5">
      <motion.span
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          background: colour,
          boxShadow:
            kind === "idle"
              ? "none"
              : `0 0 0 3px ${colour}26, 0 0 8px ${colour}aa`,
        }}
        animate={kind === "idle" ? undefined : { opacity: [0.55, 1, 0.55] }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{
          fontSize: 9.5,
          color: "rgba(15,23,42,0.55)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function OutcomeLine({
  outcome,
}: {
  outcome: { tone: "approved" | "blocked" | "pending" | "neutral"; text: string };
}) {
  if (outcome.tone === "neutral") {
    return (
      <div
        className="font-mono"
        style={{
          fontSize: 11.5,
          letterSpacing: "0.02em",
          color: "rgba(15,23,42,0.45)",
        }}
      >
        {outcome.text}
      </div>
    );
  }

  const palette =
    outcome.tone === "approved"
      ? { fg: "#15803D", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.20)" }
      : outcome.tone === "blocked"
        ? { fg: "#B45309", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" }
        : { fg: "#475569", bg: "rgba(15,23,42,0.04)", border: "rgba(15,23,42,0.10)" };

  return (
    <motion.div
      key={outcome.text}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="inline-flex items-center gap-1.5 font-mono w-fit rounded-[10px] px-2.5 py-1.5"
      style={{
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: "0.005em",
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      {outcome.tone === "approved" ? (
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : outcome.tone === "blocked" ? (
        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : null}
      {outcome.text}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Resolvers — pull data from the API into copy
   ──────────────────────────────────────────────────────────────────── */

function resolveStatus(
  worker: WorkerTileWorker,
  action: WorkerTileAction | null,
): StatusKind {
  if (action?.signatureStatus === "failed") return "blocked";
  if (action && action.timestamp > Date.now() - 90_000) return "acting";
  if (worker.isThinking) return "thinking";
  return "idle";
}

/** Verb the worker is currently doing. Hybrid copy that surfaces the
 *  sponsor brand when one is recognized in the row's counterparty or
 *  message — that's how "scanned a feed" becomes "scanned Helius" and
 *  the rail starts reading as an ecosystem-aware product.
 *
 *  Tense flips on failure: when signatureStatus === "failed" the verb
 *  switches to attempt-tense ("Tried to complete a task") so it never
 *  contradicts the red Blocked outcome line below it. */
function resolveVerb(
  worker: WorkerTileWorker,
  action: WorkerTileAction | null,
  fallbackBrand?: string | null,
): string {
  // No recent action — surface the worker's most recent finding so a
  // Sentinel-style scout that just found three bounties doesn't read
  // as "Standing by".
  if (!action) {
    if (worker.lastFinding) {
      const fb = worker.lastFinding.brand;
      const subj = compressSubject(worker.lastFinding.subject);
      switch (worker.lastFinding.kind) {
        case "opportunity":
        case "bounty":
          return fb
            ? `Found ${articleFor(fb)} ${fb} bounty${subj ? ` — ${subj}` : ""}`
            : subj
              ? `Found ${subj}`
              : "Found an opportunity";
        case "github_release":
          return fb
            ? `Spotted ${fb} release${subj ? ` — ${subj}` : ""}`
            : "Spotted a release";
        case "ecosystem_announcement":
          return fb
            ? `Spotted ${fb} announcement${subj ? ` — ${subj}` : ""}`
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

  const brand = action.brand ?? fallbackBrand ?? null;
  const failed = action.signatureStatus === "failed";
  const a = brand ? articleFor(brand) : "a";

  switch (action.tool) {
    case "post_task":
      return failed
        ? brand
          ? `Tried to post ${a} ${brand} task`
          : "Tried to post a paid task"
        : brand
          ? `Posted ${a} ${brand} task`
          : "Posted a paid task";
    case "claim_task":
      return failed
        ? brand
          ? `Tried to claim ${a} ${brand} task`
          : "Tried to claim a paid task"
        : brand
          ? `Claimed ${a} ${brand} task`
          : "Claimed a paid task";
    case "complete_task":
      return failed
        ? brand
          ? `Tried to complete ${a} ${brand} task`
          : "Tried to complete a paid task"
        : brand
          ? `Completed ${a} ${brand} task`
          : "Completed a paid task";
    case "stake_on_finding":
      return failed ? "Tried to stake" : "Staked on a finding";
    case "subscribe_to_agent":
      return failed ? "Tried to pay another worker" : "Paid another worker";
    default:
      return action.tool.replace(/_/g, " ");
  }
}

/** Pick "a" or "an" before a brand name based on its first letter.
 *  Vowel start → "an" (Anchor, Agave, Anza). Consonant → "a"
 *  (Squads, Superteam, Helius, Metaplex, Colosseum, Jupiter, Solana). */
function articleFor(brand: string | null | undefined): "a" | "an" {
  if (!brand) return "a";
  const c = brand[0]?.toLowerCase() ?? "";
  return c === "a" || c === "e" || c === "i" || c === "o" || c === "u"
    ? "an"
    : "a";
}

/** Trim a long signal subject down to a punchy one-line. The /app
 *  worker tile only has ~280px of horizontal room for the verb so we
 *  drop dollar amounts and tail clauses. */
function compressSubject(s: string): string {
  if (!s) return "";
  // Drop anything past the first " — " or " · " — those are usually
  // metadata (reward, deadline) we already render in the activity sheet.
  const cut = s.split(/\s[—·]\s/)[0];
  return cut.length > 42 ? `${cut.slice(0, 40)}…` : cut;
}

/** The outcome line — the tension. "Tried $X → ✅ Approved" or
 *  "Attempted $X → ❌ Blocked (reason)" makes the chain visible as the
 *  enforcer. Falls back to a neutral line when the worker has no
 *  recent action with money attached. */
function resolveOutcome(
  worker: WorkerTileWorker,
  action: WorkerTileAction | null,
): { tone: "approved" | "blocked" | "pending" | "neutral"; text: string } {
  if (!action) {
    if (worker.totalEarnedUsd > 0) {
      return {
        tone: "neutral",
        text: `Earned $${worker.totalEarnedUsd.toFixed(2)} so far`,
      };
    }
    // Newbie-friendly fallback — no "cycles" jargon. The chassis is
    // about ownership; this should read as a friendly idle state.
    return {
      tone: "neutral",
      text: "Standing by",
    };
  }

  const amt = action.amountUsd != null ? action.amountUsd : 0;
  const amtStr = amt > 0 ? `$${amt.toFixed(2)}` : "an action";

  if (action.signatureStatus === "failed") {
    const reason = compressReason(action.message);
    return {
      tone: "blocked",
      text: reason
        ? `Attempted ${amtStr} → Blocked (${reason})`
        : `Attempted ${amtStr} → Blocked by chain`,
    };
  }
  if (action.signatureStatus === "success") {
    if (action.tool === "stake_on_finding") {
      return { tone: "approved", text: `Staked ${amtStr} → Settled` };
    }
    if (action.tool === "complete_task") {
      return { tone: "approved", text: `Earned ${amtStr} → Settled` };
    }
    return { tone: "approved", text: `Spent ${amtStr} → Approved` };
  }
  return {
    tone: "pending",
    text: amt > 0 ? `Trying ${amtStr}…` : "Trying…",
  };
}

/** Trim raw policy / RPC failure messages into a 2-3 word badge.
 *  Patterns expanded to cover the actual error strings the chain
 *  returns on a fresh-vault device:
 *    "Attempt to debit an account but found no record of a prior
 *     credit"  → "low balance"   (most common on $0 vault)
 *    "Insufficient funds"        → "low balance"
 *    "fee payer ... no SOL"      → "no fee gas"
 *  Plus the policy-program codes (daily cap, weekly cap, per-tx,
 *  velocity, allowlist, memo, kill switch). */
function compressReason(message: string | null): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  // Chain-side failures — these are what fresh-vault users hit first
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
  // Policy-program rejections
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

