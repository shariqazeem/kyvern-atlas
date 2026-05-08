"use client";

/**
 * FindingDetail — Phase 3.
 *
 * Detail card shown in the right pane on desktop and as the body of
 * /app/inbox/[id] on mobile. Title at top, kind+worker chips, source
 * meta, body content, action buttons at the bottom.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  ExternalLink,
  Send,
  Shuffle,
  X,
  Zap,
} from "lucide-react";
import type { Signal } from "@/lib/agents/types";
import {
  severityForSignal,
  severityVisuals,
} from "@/lib/agents/signal-severity";

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface Props {
  signal: SignalWithWorker;
  network: "devnet" | "mainnet";
  onMarkRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
}

/**
 * Phase 8 (2026-05-08) — kind-specific badge + subject reframe.
 *
 * The previous "ROUTINE · OBSERVATION" eyebrow was the runner's
 * internal taxonomy leaking into the UI. Each user-facing kind now
 * gets a hand-crafted badge whose first word answers "what kind of
 * thing is this?" and a reframed subject that answers "what does this
 * mean for me?" — the value, not the event.
 */
const KIND_BADGE: Record<
  string,
  { label: string; tone: "green" | "amber" | "blue" | "red" | "gray" }
> = {
  trigger_fired: { label: "✓ ON-CHAIN", tone: "green" },
  trigger_blocked: { label: "✕ BLOCKED ON-CHAIN", tone: "red" },
  drafted_application: { label: "✉ READY TO SUBMIT", tone: "blue" },
  wallet_alert: { label: "🐋 MATERIAL MOVE", tone: "blue" },
  trigger_armed: { label: "⚠ HEADS-UP", tone: "amber" },
  // Legacy kinds — kept for historical signals viewed from worker
  // pages. Inbox queries filter these out.
  bounty: { label: "BOUNTY", tone: "gray" },
  ecosystem_announcement: { label: "ANNOUNCEMENT", tone: "gray" },
  wallet_move: { label: "WALLET MOVE", tone: "gray" },
  price_trigger: { label: "PRICE TRIGGER", tone: "gray" },
  github_release: { label: "RELEASE", tone: "gray" },
  observation: { label: "OBSERVATION", tone: "gray" },
  condition_update: { label: "UPDATE", tone: "gray" },
  opportunity: { label: "OPPORTUNITY", tone: "gray" },
  market_intel: { label: "MARKET INTEL", tone: "gray" },
};

const BADGE_COLORS: Record<
  "green" | "amber" | "blue" | "red" | "gray",
  { bg: string; fg: string }
> = {
  green: { bg: "rgba(34,197,94,0.10)", fg: "#15803D" },
  amber: { bg: "rgba(245,158,11,0.12)", fg: "#92400E" },
  blue: { bg: "rgba(59,130,246,0.10)", fg: "#1D4ED8" },
  red: { bg: "rgba(239,68,68,0.10)", fg: "#B91C1C" },
  gray: { bg: "rgba(15,23,42,0.04)", fg: "rgba(15,23,42,0.55)" },
};

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Reframe the runner-emitted subject into value-first copy. The
 * runners emit event-shaped subjects ("SOL hit $88.06", "SOL
 * approaching below $88.12") because they're structured for
 * deduplication — but the inbox needs to read like the user just got
 * a notification on their phone: outcome-shaped, not log-shaped.
 */
function reframeSubject(signal: { kind: string; subject: string }): string {
  if (signal.kind === "trigger_fired") {
    // "SOL hit $88.06" → "You got SOL at $88.06"
    const m = signal.subject.match(/^([A-Z]{2,8})\s+hit\s+\$?(\S+)/i);
    if (m) return `You got ${m[1].toUpperCase()} at $${m[2]}`;
    return signal.subject;
  }
  if (signal.kind === "trigger_blocked") {
    // "SOL hit $87.99 — payout blocked" → "Pulse tried to buy SOL at $87.99"
    const m = signal.subject.match(/^([A-Z]{2,8})\s+hit\s+\$?(\S+?)\s*—/i);
    if (m) return `Pulse tried to buy ${m[1].toUpperCase()} at $${m[2]}`;
    return signal.subject;
  }
  if (signal.kind === "trigger_armed") {
    // "SOL approaching below $88.12" → "SOL is close to $88.12"
    const m = signal.subject.match(
      /^([A-Z]{2,8})\s+approaching\s+(?:below|above)\s+\$?(\S+)/i,
    );
    if (m) return `${m[1].toUpperCase()} is close to $${m[2]}`;
    return signal.subject;
  }
  return signal.subject;
}

/** Pull a labelled value out of an evidence bullet list. The runner
 *  emits "Trigger condition: SOL below $88.12" / "Breach: live price
 *  $88.06" etc.; this lets the value-first body grab those without
 *  parsing fragile prose. */
function evidenceField(
  evidence: string[] | undefined,
  label: string,
): string | null {
  if (!evidence) return null;
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "i");
  for (const e of evidence) {
    const m = e.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

export function FindingDetail({
  signal,
  network,
  onMarkRead,
  onDismiss,
  onSnooze,
}: Props) {
  // Phase 8 — kind-specific badge replaces the severityVisuals
  // (severity is computed from on_chain + ageMs and gave generic
  // "ROUTINE / IMPORTANT / URGENT" labels that meant nothing to a
  // user). The badge now tells the user what kind of moment this is
  // ("✓ ON-CHAIN" for a fired trigger, "✉ READY TO SUBMIT" for a
  // drafted bounty application, etc.). severityVisuals is still used
  // for the row-dot color in the list view via signal-severity.ts.
  const _sev = severityForSignal(signal);
  void _sev;
  const _vis = severityVisuals(_sev, !!signal.signature);
  void _vis;
  const badge = KIND_BADGE[signal.kind] ?? {
    label: signal.kind.toUpperCase(),
    tone: "gray" as const,
  };
  const badgeColor = BADGE_COLORS[badge.tone];
  const reframedSubject = reframeSubject(signal);
  const [marked, setMarked] = useState(signal.status !== "unread");
  const [busy, setBusy] = useState<"read" | "dismiss" | "snooze" | null>(null);

  const handleAction = async (
    action: "read" | "dismiss" | "snooze",
    fn: () => Promise<void>,
  ) => {
    if (busy) return;
    setBusy(action);
    try {
      await fn();
      if (action === "read") setMarked(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      className="rounded-2xl bg-white p-5 sm:p-6"
      style={{
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      {/* Phase 8 — kind-specific badge. Pill, not eyebrow. */}
      <div className="mb-3">
        <span
          className="inline-flex items-center font-mono uppercase tracking-[0.14em] rounded-full px-2.5 py-1"
          style={{
            fontSize: 9.5,
            background: badgeColor.bg,
            color: badgeColor.fg,
            fontWeight: 600,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Reframed subject — value-first copy */}
      <h2
        className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.012em] leading-[1.3] mb-2"
        style={{ color: "#0A0A0A" }}
      >
        {reframedSubject}
      </h2>

      {/* Worker + ago */}
      <div
        className="flex items-baseline gap-2 mb-4 text-[12px]"
        style={{ color: "#6B7280" }}
      >
        <span style={{ fontSize: 14 }}>{signal.worker.emoji}</span>
        <span style={{ fontWeight: 500, color: "#0A0A0A" }}>
          {signal.worker.name}
        </span>
        <span aria-hidden style={{ color: "rgba(15,23,42,0.20)" }}>
          ·
        </span>
        <span>{fmtAgo(signal.createdAt)}</span>
      </div>

      {/* Source */}
      {signal.sourceUrl && (
        <div className="mb-3">
          <div
            className="font-mono uppercase tracking-[0.14em] mb-0.5"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
          >
            Source
          </div>
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11.5px] truncate max-w-full"
            style={{ color: "#0A0A0A" }}
          >
            <span className="truncate">{signal.sourceUrl}</span>
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </a>
        </div>
      )}

      {/* Phase 8 — kind-specific value-first body. The four user-facing
          kinds get hand-crafted prose that answers "what does this mean
          for me?" instead of an evidence-bullet dump. Legacy kinds keep
          the bullet list as a fallback. */}
      <KindBody signal={signal} />

      {/* On-chain */}
      {signal.onChainSignature && (
        <a
          href={`https://explorer.solana.com/tx/${signal.onChainSignature}?cluster=${network}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono mb-3"
          style={{ fontSize: 11, color: "#15803D" }}
        >
          {signal.onChainSignature.slice(0, 8)}…
          {signal.onChainSignature.slice(-6)}
          <ExternalLink className="w-3 h-3" strokeWidth={2} />
        </a>
      )}

      {/* Per-kind primary action (Phase 7). */}
      <KindPrimaryAction signal={signal} network={network} />

      {/* Action buttons */}
      <div
        className="flex items-center flex-wrap gap-1.5 pt-3 mt-2"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        {signal.sourceUrl && signal.kind !== "drafted_application" && (
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11.5px] font-medium transition active:scale-[0.97]"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.85)",
            }}
          >
            Read more
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </a>
        )}
        <ActionButton
          icon={<Check className="w-3 h-3" strokeWidth={2.5} />}
          label={marked ? "Read" : "Mark read"}
          disabled={marked || busy === "read"}
          loading={busy === "read"}
          onClick={() =>
            handleAction("read", () => onMarkRead(signal.id))
          }
        />
        <ActionButton
          icon={<X className="w-3 h-3" strokeWidth={2.5} />}
          label="Dismiss"
          disabled={busy === "dismiss"}
          loading={busy === "dismiss"}
          onClick={() =>
            handleAction("dismiss", () => onDismiss(signal.id))
          }
        />
        <ActionButton
          icon={<Clock className="w-3 h-3" strokeWidth={2} />}
          label="Snooze 4h"
          disabled={busy === "snooze"}
          loading={busy === "snooze"}
          onClick={() =>
            handleAction("snooze", () => onSnooze(signal.id))
          }
        />
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
   KindPrimaryAction (Phase 7) — Submit on drafted_application,
   Mirror on wallet_alert, View tx on trigger_fired.
   ──────────────────────────────────────────────────────────────────── */

function KindPrimaryAction({
  signal,
  network,
}: {
  signal: SignalWithWorker;
  network: "devnet" | "mainnet";
}) {
  if (signal.kind === "drafted_application") {
    return <SubmitBlock signal={signal} network={network} />;
  }
  if (signal.kind === "wallet_alert") {
    return <MirrorBlock signal={signal} />;
  }
  if (signal.kind === "trigger_fired" && signal.onChainSignature) {
    return (
      <a
        href={`https://explorer.solana.com/tx/${signal.onChainSignature}?cluster=${network}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 h-9 px-4 rounded-full text-[12px] font-medium transition active:scale-[0.97]"
        style={{
          background: "#15803D",
          color: "#FFFFFF",
          border: "1px solid rgba(21,128,61,0.85)",
        }}
      >
        <Zap className="w-3.5 h-3.5" strokeWidth={2} />
        View on-chain swap
        <ExternalLink className="w-3 h-3" strokeWidth={2} />
      </a>
    );
  }
  return null;
}

/**
 * Phase 8 — value-first kind-specific body.
 *
 * Each user-facing kind gets hand-crafted prose that opens with
 * what the user gained / has to do, not what the worker observed.
 * Legacy kinds keep the bullet-list fallback for the worker activity
 * page (where signals from any kind can still be inspected).
 */
function KindBody({ signal }: { signal: SignalWithWorker }) {
  if (signal.kind === "trigger_fired") {
    const breach = evidenceField(signal.evidence, "Breach");
    const condition = evidenceField(signal.evidence, "Trigger condition");
    const spend = evidenceField(signal.evidence, "Spend");
    // Pull the asset + price out of the (already reframed) subject so
    // the prose lines up: "You got SOL at $88.06" → asset=SOL, price=88.06.
    const m = signal.subject.match(/^([A-Z]{2,8})\s+hit\s+\$?([0-9.]+)/i);
    const asset = m?.[1]?.toUpperCase();
    const price = m?.[2];
    // Estimate token amount ≈ amount_usd / price_usd. Conservative —
    // doesn't subtract the 1% Kyvern fee or pool slippage; surfaces an
    // approximate so the user has a number to feel.
    const spendMatch = spend?.match(/\$([0-9.]+)/);
    const spendUsd = spendMatch ? parseFloat(spendMatch[1]) : null;
    const priceNum = price ? parseFloat(price) : null;
    const tokensApprox =
      spendUsd && priceNum && priceNum > 0
        ? (spendUsd * 0.99) / priceNum
        : null;
    return (
      <div className="mb-3">
        <p
          className="text-[14px] leading-[1.65] mb-3"
          style={{ color: "#0A0A0A" }}
        >
          Your trigger fired:{" "}
          <span style={{ color: "#374151" }}>
            {condition?.toLowerCase() ?? "the condition you set"}
          </span>
          . The chain validated the breach via oracle and moved{" "}
          <span style={{ fontWeight: 600 }}>{spend ?? "your pre-approved spend"}</span>
          {asset ? ` from your vault to your wallet as ${asset}` : ""}.
        </p>
        {tokensApprox !== null && asset && (
          <p
            className="text-[13px] leading-[1.6] mb-3"
            style={{ color: "#374151" }}
          >
            You now hold ~{tokensApprox.toFixed(asset === "SOL" ? 5 : 2)}{" "}
            more {asset} than you did before this trigger. The chain
            enforced every step.
          </p>
        )}
        {breach && (
          <p
            className="text-[12px] font-mono leading-[1.6]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            {breach}
          </p>
        )}
      </div>
    );
  }

  if (signal.kind === "trigger_blocked") {
    const condition = evidenceField(signal.evidence, "Trigger condition");
    const spend = evidenceField(signal.evidence, "Spend");
    const status = evidenceField(signal.evidence, "Status");
    return (
      <div className="mb-3">
        <p
          className="text-[14px] leading-[1.65] mb-3"
          style={{ color: "#0A0A0A" }}
        >
          Your trigger crossed (
          <span style={{ color: "#374151" }}>
            {condition?.toLowerCase() ?? "the condition you set"}
          </span>
          ), but the chain refused the payout. Your USDC stayed in the
          vault — nothing was spent.
        </p>
        {status && (
          <p
            className="text-[12.5px] leading-[1.5]"
            style={{ color: "#B91C1C" }}
          >
            {status}
          </p>
        )}
        {spend && (
          <p
            className="text-[12px] font-mono leading-[1.6] mt-1"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Pre-approved spend: {spend}
          </p>
        )}
      </div>
    );
  }

  if (signal.kind === "drafted_application") {
    const skills = evidenceField(signal.evidence, "Skills matched");
    const reward = evidenceField(signal.evidence, "Reward");
    return (
      <div className="mb-3">
        <p
          className="text-[14px] leading-[1.65]"
          style={{ color: "#0A0A0A" }}
        >
          {skills ? (
            <>
              Your skills (<span style={{ color: "#374151" }}>{skills}</span>)
              match this bounty. Sentinel drafted your application.
            </>
          ) : (
            <>Sentinel drafted your application for this bounty.</>
          )}{" "}
          Read it, edit if needed, send with one tap.
        </p>
        {reward && (
          <p
            className="text-[12.5px] leading-[1.5] mt-2"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Reward: {reward}
          </p>
        )}
      </div>
    );
  }

  if (signal.kind === "wallet_alert") {
    const direction = evidenceField(signal.evidence, "Direction");
    const sizeUsd = evidenceField(signal.evidence, "Size");
    const summary =
      signal.evidence?.[0] ??
      "A watched wallet just made a material move.";
    return (
      <div className="mb-3">
        <p
          className="text-[14px] leading-[1.65]"
          style={{ color: "#0A0A0A" }}
        >
          {summary}
          {direction && sizeUsd ? (
            <>
              {" "}
              Their position bias just shifted to{" "}
              <span style={{ fontWeight: 600 }}>{direction.toLowerCase()}</span>.
            </>
          ) : null}
        </p>
        <p
          className="text-[13px] leading-[1.6] mt-2"
          style={{ color: "#374151" }}
        >
          You can mirror this with Pulse — set a price trigger so you act
          if the asset moves into your range.
        </p>
      </div>
    );
  }

  if (signal.kind === "trigger_armed") {
    const live = evidenceField(signal.evidence, "Live price");
    const distance = signal.evidence?.find((e) =>
      /from\s+\$/i.test(e),
    );
    return (
      <div className="mb-3">
        <p
          className="text-[14px] leading-[1.65]"
          style={{ color: "#0A0A0A" }}
        >
          {live ? (
            <>
              Live <span style={{ fontWeight: 600 }}>{live}</span>
              {distance ? ` — ${distance.toLowerCase()}.` : "."}
            </>
          ) : (
            <>Live price is close to your trigger threshold.</>
          )}{" "}
          If it crosses, your pre-approved spend fires.
        </p>
        <p
          className="text-[12px] leading-[1.55] mt-2"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          You won&apos;t see this again for this trigger until the price
          moves materially or 24h pass.
        </p>
      </div>
    );
  }

  // Legacy / non-user-facing kinds — keep the bullet list for the
  // worker activity page (these don't reach the inbox).
  if (signal.evidence && signal.evidence.length > 0) {
    return (
      <div className="mb-3">
        <div
          className="font-mono uppercase tracking-[0.14em] mb-1"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
        >
          Evidence
        </div>
        <ul
          className="flex flex-col gap-1 text-[13px] leading-[1.6]"
          style={{ color: "#0A0A0A" }}
        >
          {signal.evidence.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden style={{ color: "rgba(15,23,42,0.30)" }}>
                •
              </span>
              <span className="flex-1">{e}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

function SubmitBlock({
  signal,
  network,
}: {
  signal: SignalWithWorker;
  network: "devnet" | "mainnet";
}) {
  const [busy, setBusy] = useState(false);
  const [memoTx, setMemoTx] = useState<string | null>(
    signal.submissionMemoTx ?? null,
  );
  const [submittedAt, setSubmittedAt] = useState<number | null>(
    signal.submittedAt ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || submittedAt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/findings/${signal.id}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.reason || data?.blocked?.reason || "submit failed");
        return;
      }
      setMemoTx(data.memoTx ?? null);
      setSubmittedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (submittedAt) {
    return (
      <div
        className="rounded-[10px] p-3 mt-3"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.22)",
        }}
      >
        <div
          className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] mb-1"
          style={{ color: "#15803D", fontSize: 9.5 }}
        >
          <Check className="w-3 h-3" strokeWidth={2.5} />
          Submitted · receipt anchored
        </div>
        <div className="text-[12px]" style={{ color: "#0A0A0A" }}>
          Submission memo on-chain. Email relayed if configured.
        </div>
        {memoTx && (
          <a
            href={`https://explorer.solana.com/tx/${memoTx}?cluster=${network}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono mt-1"
            style={{ color: "#15803D", fontSize: 11 }}
          >
            {memoTx.slice(0, 8)}…{memoTx.slice(-6)}
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center flex-wrap gap-2">
      <motion.button
        type="button"
        onClick={submit}
        disabled={busy}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-medium transition disabled:opacity-60"
        style={{
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.85)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.10)",
        }}
      >
        {busy ? (
          <>
            <span
              className="w-3 h-3 rounded-full animate-spin"
              style={{
                border: "1.5px solid rgba(255,255,255,0.30)",
                borderTopColor: "#FFFFFF",
              }}
            />
            Sending…
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
            Submit application
          </>
        )}
      </motion.button>
      {signal.sourceUrl && (
        <a
          href={signal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-[11.5px] font-medium transition active:scale-[0.97]"
          style={{
            background: "#FFFFFF",
            color: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        >
          ↗ Read bounty
        </a>
      )}
      {error && (
        <span
          className="font-mono text-[10.5px]"
          style={{ color: "#B45309" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

function MirrorBlock({ signal }: { signal: SignalWithWorker }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mirrored, setMirrored] = useState<string | null>(
    signal.mirroredPulseTriggerId ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(180);
  const [spend, setSpend] = useState<number>(5);
  const [direction, setDirection] = useState<"below" | "above">("below");

  async function mirror() {
    if (busy || mirrored) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/findings/${signal.id}/mirror`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: "SOL",
          direction,
          threshold_usd: threshold,
          spend_usdc: spend,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.reason || "mirror failed");
        return;
      }
      setMirrored(data.triggerId ?? null);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "mirror failed");
    } finally {
      setBusy(false);
    }
  }

  if (mirrored) {
    return (
      <div
        className="rounded-[10px] p-3 mt-3"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.22)",
        }}
      >
        <div
          className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] mb-1"
          style={{ color: "#15803D", fontSize: 9.5 }}
        >
          <Check className="w-3 h-3" strokeWidth={2.5} />
          Mirrored to Pulse
        </div>
        <div className="text-[12px]" style={{ color: "#0A0A0A" }}>
          A new trigger is armed on your Pulse worker.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-medium transition"
          style={{
            background: "#0A0A0A",
            color: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.85)",
          }}
        >
          <Shuffle className="w-3.5 h-3.5" strokeWidth={2} />
          Mirror this swap
        </motion.button>
      ) : (
        <div
          className="rounded-[12px] p-4 flex flex-col gap-3"
          style={{
            background: "#FAFAFA",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Mirror this swap into a Pulse trigger
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as "below" | "above")
              }
              className="px-2.5 py-1.5 rounded-[6px] outline-none text-[12px]"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                color: "#0A0A0A",
              }}
            >
              <option value="below">below</option>
              <option value="above">above</option>
            </select>
            <input
              type="number"
              value={threshold}
              onChange={(e) =>
                setThreshold(parseFloat(e.target.value || "0"))
              }
              className="px-2.5 py-1.5 rounded-[6px] outline-none font-mono tabular-nums"
              style={{
                width: 100,
                fontSize: 12,
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                color: "#0A0A0A",
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
            >
              USD
            </span>
            <span aria-hidden style={{ color: "rgba(15,23,42,0.20)" }}>
              ·
            </span>
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
            >
              spend
            </span>
            <input
              type="number"
              value={spend}
              onChange={(e) => setSpend(parseFloat(e.target.value || "0"))}
              className="px-2.5 py-1.5 rounded-[6px] outline-none font-mono tabular-nums"
              style={{
                width: 80,
                fontSize: 12,
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                color: "#0A0A0A",
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
            >
              USDC
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={mirror}
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-medium transition disabled:opacity-60"
              style={{
                background: "#0A0A0A",
                color: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.85)",
              }}
            >
              {busy ? "Creating…" : "Create trigger"}
            </motion.button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center h-9 px-3 rounded-full text-[12px] transition"
              style={{
                background: "transparent",
                color: "rgba(15,23,42,0.55)",
                border: "1px solid rgba(15,23,42,0.10)",
              }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <span
              className="font-mono text-[10.5px]"
              style={{ color: "#B45309" }}
            >
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11.5px] font-medium transition disabled:opacity-50"
      style={{
        background: "#FFFFFF",
        color: "#0A0A0A",
        border: "1px solid rgba(15,23,42,0.10)",
      }}
    >
      {loading ? (
        <span
          className="w-3 h-3 rounded-full animate-spin"
          style={{
            border: "1.5px solid rgba(15,23,42,0.20)",
            borderTopColor: "#0A0A0A",
          }}
        />
      ) : (
        icon
      )}
      {label}
    </motion.button>
  );
}
