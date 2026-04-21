"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * JourneyChecklist — the "here's what to do next" card on /app home.
 *
 * Purpose:
 *   Every signed-in user touches two sides of Kyvern — spend (letting an
 *   agent pay within on-chain limits) and earn (capturing every payment
 *   that lands at their service). Whichever they start with, we want
 *   them to experience BOTH sides within the first ~5 minutes, because
 *   the platform thesis is unified agent commerce on Solana — not two
 *   separate products.
 *
 *   Five concrete tasks, live-detected:
 *     1. Create a vault                            (spend)
 *     2. Fund it with test USDC                    (spend)
 *     3. Send a test payment                       (spend · proof)
 *     4. Set up a service                          (earn)
 *     5. Receive your first x402 payment           (earn)
 *
 *   When all five are done, the component self-collapses to a
 *   dismissable green "You're shipping on both sides" bar.
 *
 * Design:
 *   Matches the eyebrow + title + subhead rhythm of every other /app
 *   page. Rows have StepCircle, a side chip (Spend / Earn), and a
 *   contextual CTA that routes into the right place. Fully dismissable.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
  Wallet,
  Zap,
  X,
} from "lucide-react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

export interface JourneyState {
  /** Has the user created at least one vault? */
  hasVault: boolean;
  /** USDC balance across all vaults, in USD. 0 means unfunded. */
  vaultUsdcBalance: number | null;
  /** Has the user's agent made at least one settled on-chain payment? */
  hasSettledPayment: boolean;
  /** Has the user generated at least one Pulse service key? */
  hasPulseKey: boolean;
  /** Has Pulse captured at least one inbound payment event? */
  hasPulseEvent: boolean;
  /** User's first vault id (for deep-linking to funding/testing). */
  firstVaultId: string | null;
}

const DISMISS_KEY = "kv:journey-dismissed";

export function JourneyChecklist({ state }: { state: JourneyState }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
  }, []);

  // Determine which tasks are done. Copy matches the autonomy thesis:
  // users deploy AGENTS (not "vaults"), give them real money, watch
  // Solana enforce their policies, then eventually earn from other
  // agents paying their own services.
  const tasks: Task[] = [
    {
      id: "vault",
      title: "Deploy your first agent",
      description: "A Squads multisig + Kyvern policy PDA bound to a keypair.",
      done: state.hasVault,
      side: "pay",
      cta: state.hasVault
        ? null
        : { label: "Deploy agent", href: "/vault/new" },
    },
    {
      id: "fund",
      title: "Give it real USDC",
      description: "Circle faucet → the agent's on-chain wallet. One click.",
      done:
        state.hasVault &&
        state.vaultUsdcBalance !== null &&
        state.vaultUsdcBalance > 0,
      side: "pay",
      locked: !state.hasVault,
      cta:
        state.hasVault && state.firstVaultId
          ? {
              label: "Open fund widget",
              href: `/vault/${state.firstVaultId}`,
            }
          : null,
    },
    {
      id: "pay",
      title: "Watch Solana enforce the policy",
      description:
        "Run a good call and a bad one. Solana settles one, refuses the other.",
      done: state.hasSettledPayment,
      side: "pay",
      locked: !state.hasVault,
      cta:
        state.hasVault && state.firstVaultId
          ? {
              label: "Run test payment",
              href: `/vault/${state.firstVaultId}`,
            }
          : null,
    },
    {
      id: "service",
      title: "Capture payments from other agents",
      description:
        "Wrap your x402 endpoint so Kyvern agents paying you show up with identity.",
      done: state.hasPulseKey,
      side: "earn",
      cta: state.hasPulseKey
        ? null
        : { label: "Set up a service", href: "/pulse/dashboard/keys" },
    },
    {
      id: "earn",
      title: "Receive your first agent payment",
      description: "Verified on Solana, tagged with the payer's policy PDA.",
      done: state.hasPulseEvent,
      side: "earn",
      locked: !state.hasPulseKey,
      cta: state.hasPulseKey
        ? {
            label: "Open setup guide",
            href: "/pulse/dashboard/setup",
          }
        : null,
    },
  ];

  const doneCount = tasks.filter((t) => t.done).length;
  const allDone = doneCount === tasks.length;

  // When user has explicitly dismissed, hide completely.
  if (dismissed) return null;

  // When every step is done, show a small celebratory bar — dismissable.
  if (allDone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="rounded-[14px] px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ background: "var(--success)" }}
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </span>
          <div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Your agent is running on Solana.
            </p>
            <p
              className="text-[11.5px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Policy active · first revenue captured · everything verifiable on-chain.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="p-1.5 rounded-[8px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-quaternary)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 24px 72px -48px rgba(37,99,235,0.14)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Deploy · Fund · Run · Earn · {doneCount}/{tasks.length}
          </p>
          <h2
            className="mt-0.5 text-[18px] font-semibold tracking-[-0.015em]"
            style={{ color: "var(--text-primary)" }}
          >
            Your first autonomous agent, in five steps.
          </h2>
          <p
            className="mt-0.5 text-[12.5px] leading-[1.55]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Five steps across both sides of Kyvern. Your agent spends, your
            service earns, everything verified on Solana.
          </p>
        </div>
        <button
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="p-1.5 rounded-[8px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-quaternary)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress rail — two-color so pay/earn sides are visually distinct */}
      <div
        className="mx-6 h-[2px] rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          initial={false}
          animate={{ width: `${(doneCount / tasks.length) * 100}%` }}
          transition={{ duration: 0.7, ease: EASE }}
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #4F46E5 0%, #4F46E5 60%, #0EA5E9 60%, #0EA5E9 100%)",
          }}
        />
      </div>

      <ul className="px-6 py-5 space-y-2.5">
        {tasks.map((t, i) => (
          <Row key={t.id} index={i} task={t} />
        ))}
      </ul>
    </motion.section>
  );
}

interface Task {
  id: string;
  title: string;
  description: string;
  done: boolean;
  side: "pay" | "earn";
  locked?: boolean;
  cta: { label: string; href: string } | null;
}

function Row({ task, index }: { task: Task; index: number }) {
  const sideAccent = task.side === "pay" ? "#4F46E5" : "#0EA5E9";
  // Side chips: "Agent" (the thing you deploy) vs "Revenue" (what comes
  // back when other agents pay your services). Keeps the flat mental
  // model — one product, two kinds of activity.
  const sideLabel = task.side === "pay" ? "Agent" : "Revenue";

  return (
    <motion.li
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * index, ease: EASE }}
      className="flex items-start gap-3"
    >
      <StepCircle done={task.done} locked={task.locked} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[13.5px] font-medium"
            style={{
              color: task.done
                ? "var(--text-tertiary)"
                : "var(--text-primary)",
              textDecoration: task.done ? "line-through" : "none",
              textDecorationColor: "var(--text-quaternary)",
            }}
          >
            {task.title}
          </span>
          <span
            className="text-[9.5px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[6px]"
            style={{
              color: sideAccent,
              background:
                task.side === "pay" ? "rgba(79,70,229,0.08)" : "rgba(14,165,233,0.08)",
            }}
          >
            {sideLabel}
          </span>
          {task.locked && (
            <span
              className="text-[9.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-quaternary)" }}
            >
              · locked
            </span>
          )}
        </div>
        <p
          className="mt-0.5 text-[11.5px] leading-[1.45]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {task.description}
        </p>
      </div>
      {!task.done && task.cta && !task.locked && (
        <Link
          href={task.cta.href}
          className="group inline-flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[11.5px] font-semibold transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
          style={{
            background: "var(--text-primary)",
            color: "var(--background)",
            whiteSpace: "nowrap",
          }}
        >
          {task.cta.label}
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </motion.li>
  );
}

function StepCircle({ done, locked }: { done: boolean; locked?: boolean }) {
  return (
    <span
      className="inline-flex w-5 h-5 rounded-full items-center justify-center shrink-0 mt-[1px]"
      style={{
        background: done ? "var(--success)" : "transparent",
        border: done
          ? "none"
          : `1.5px solid ${locked ? "var(--border-subtle)" : "var(--border-2)"}`,
        opacity: locked ? 0.5 : 1,
      }}
    >
      {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}

/**
 * Inverse helper for pages that want to nudge users toward the other side.
 * Not used by the checklist itself — exported so /vault/[id]'s success
 * screen, /app/services' empty state, etc. can drop a consistent banner.
 */
export function CrossConversionBanner({
  direction,
}: {
  /** "to-earn" = you've set up pay-side, now see the earn-side. */
  direction: "to-earn" | "to-pay";
}) {
  const config =
    direction === "to-earn"
      ? {
          accent: "#0EA5E9",
          tintBg: "rgba(14,165,233,0.06)",
          eyebrow: "Revenue",
          title: "Your agent is running. Now earn from agent traffic.",
          description:
            "Wrap any x402 endpoint with one line of middleware. Every inbound Kyvern agent that pays you shows up with verifiable identity, policy context, and on-chain reputation.",
          cta: { label: "Set up a service", href: "/pulse/dashboard/setup" },
          icon: Zap,
        }
      : {
          accent: "#4F46E5",
          tintBg: "rgba(79,70,229,0.06)",
          eyebrow: "Agents",
          title: "Your service is earning. Now deploy an agent of your own.",
          description:
            "Hand an AI agent real USDC. Set the rules on-chain. Let it run for days — Solana enforces every boundary, even when your prompts go wild.",
          cta: { label: "Deploy an agent", href: "/vault/new" },
          icon: Wallet,
        };

  const Icon = config.icon;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-[18px] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      style={{
        background: config.tintBg,
        border: `0.5px solid ${config.accent}33`,
      }}
    >
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
        style={{ background: "white" }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: config.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: config.accent }}
        >
          {config.eyebrow}
        </p>
        <h3
          className="mt-0.5 text-[15px] font-semibold tracking-[-0.015em]"
          style={{ color: "var(--text-primary)" }}
        >
          {config.title}
        </h3>
        <p
          className="mt-1 text-[12.5px] leading-[1.5]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {config.description}
        </p>
      </div>
      <Link
        href={config.cta.href}
        className="group inline-flex items-center gap-1.5 h-10 px-4 rounded-[12px] text-[13px] font-semibold transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] whitespace-nowrap"
        style={{
          background: config.accent,
          color: "white",
          boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 10px 28px ${config.accent}33`,
        }}
      >
        {config.cta.label}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </motion.aside>
  );
}

// Re-exported for optional decoration on pages that want a small
// "Sparkles" flourish on the cross-conversion row without pulling the
// full banner.
export { Sparkles };
