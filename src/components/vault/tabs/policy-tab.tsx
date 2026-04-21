"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <PolicyTab/> — the rules surface.
 *
 * Four cards, each owning one policy dimension:
 *
 *   ┌───────────────────────┬──────────────────┐
 *   │  Merchant allowlist   │  Velocity cap    │
 *   │  (chip garden)        │  (bucket + num)  │
 *   ├───────────────────────┼──────────────────┤
 *   │  Memo requirement     │  Kill switch     │
 *   │  (toggle chip)        │  (big red btn)   │
 *   └───────────────────────┴──────────────────┘
 *
 * The chip garden is a visual recall of what's allow-listed — hover
 * reveals the merchant's intended purpose. The velocity bucket fills
 * to show how close the agent is to its rate cap. Memo is a simple
 * on/off indicator. The kill switch is prominent because it's the
 * "stop everything now" button that justifies the whole product.
 * ════════════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  OctagonAlert,
  Power,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import type { Vault } from "../types";

export interface PolicyTabProps {
  vault: Vault;
  onKillSwitch?: () => void;
}

export function PolicyTab({ vault, onKillSwitch }: PolicyTabProps) {
  const paused = !!vault.pausedAt;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AllowlistCard merchants={vault.allowedMerchants} />
      <VelocityCapCard
        max={vault.maxCallsPerWindow}
        window={vault.velocityWindow}
      />
      <MemoRequirementCard required={vault.requireMemo} />
      <KillSwitchCard paused={paused} onKillSwitch={onKillSwitch} />

      {/* Full-width: on-chain proof row — links to Kyvern program + Squads multisig */}
      <div
        className="md:col-span-2 p-5 rounded-[16px] flex items-center gap-3"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
        }}
      >
        <ShieldCheck
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--agent)" }}
        />
        <p
          className="text-[12.5px] leading-[1.5] flex-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Every rule on this page is published as an on-chain PDA. Kyvern reads
          it at consensus, Squads v4 enforces it before the tx signs.
        </p>
        <Link
          href={`https://explorer.solana.com/address/${vault.squadsAddress}?cluster=${vault.network}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold transition-opacity hover:opacity-70 shrink-0"
          style={{ color: "var(--text-primary)" }}
        >
          Verify on Explorer
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Merchant allowlist — "chip garden" of who this agent can pay.
   Each chip has a subtle hover lift + a tiny domain-inference icon.
   ──────────────────────────────────────────────────────────────── */

function AllowlistCard({ merchants }: { merchants: string[] }) {
  return (
    <section
      className="p-6 rounded-[18px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <header className="flex items-center justify-between mb-4">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--agent)" }}
          >
            Merchant allowlist
          </p>
          <h3
            className="mt-1 text-[16px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Who your agent can pay.
          </h3>
        </div>
        <span
          className="text-[11px] font-mono-numbers tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          {merchants.length} merchant{merchants.length === 1 ? "" : "s"}
        </span>
      </header>

      {merchants.length === 0 ? (
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "var(--text-tertiary)" }}
        >
          No merchants allow-listed — the agent can&apos;t pay anyone. Add
          merchants from the wizard to unlock spending.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {merchants.map((m, i) => (
            <motion.span
              key={m}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-mono-numbers"
              style={{
                background: "var(--agent-bg)",
                color: "var(--agent)",
                border: "0.5px solid rgba(79,70,229,0.15)",
              }}
              title={`${m} · allowed`}
            >
              <Check className="w-3 h-3" />
              {m}
            </motion.span>
          ))}
        </div>
      )}

      <p
        className="mt-4 text-[11.5px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Anything outside this set is rejected at consensus before the tx signs.
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Velocity cap — fill bucket + big number
   ──────────────────────────────────────────────────────────────── */

function VelocityCapCard({
  max,
  window,
}: {
  max: number;
  window: "1h" | "1d" | "1w";
}) {
  const windowLabel =
    window === "1h" ? "every hour" : window === "1d" ? "every day" : "every week";
  return (
    <section
      className="p-6 rounded-[18px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <header className="flex items-center gap-2 mb-4">
        <Zap className="w-3.5 h-3.5" style={{ color: "var(--agent)" }} />
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--agent)" }}
        >
          Velocity ceiling
        </p>
      </header>
      <div className="flex items-end gap-4">
        <p
          className="text-[42px] font-semibold leading-none tracking-[-0.02em]"
          style={{
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {max}
        </p>
        <p
          className="pb-1 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          calls {windowLabel}
        </p>
      </div>
      <p
        className="mt-4 text-[11.5px] leading-[1.55]"
        style={{ color: "var(--text-tertiary)" }}
      >
        After this many calls land in the window, new requests are rate-limited
        at the policy layer. Prevents a prompt-injection loop from draining you
        in seconds.
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Memo requirement — on/off indicator.
   ──────────────────────────────────────────────────────────────── */

function MemoRequirementCard({ required }: { required: boolean }) {
  return (
    <section
      className="p-6 rounded-[18px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <header className="flex items-center gap-2 mb-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Memo requirement
        </p>
      </header>
      <div className="flex items-center gap-4">
        <div
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold"
          style={{
            background: required ? "var(--success-bg)" : "var(--surface-2)",
            color: required ? "var(--success-deep)" : "var(--text-tertiary)",
            border: required
              ? "0.5px solid rgba(34,197,94,0.25)"
              : "0.5px solid var(--border-subtle)",
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: required ? "var(--success)" : "var(--text-quaternary)",
            }}
          />
          {required ? "Required" : "Not required"}
        </div>
      </div>
      <p
        className="mt-4 text-[11.5px] leading-[1.55]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {required
          ? "Every payment must include a reason field. Payments without a memo are refused at the policy layer."
          : "Memos are optional. Consider enabling for audit-heavy agents where every payment needs a reason."}
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Kill switch — the justification for the whole product.
   Big prominent button, red when active, muted when armed.
   ──────────────────────────────────────────────────────────────── */

function KillSwitchCard({
  paused,
  onKillSwitch,
}: {
  paused: boolean;
  onKillSwitch?: () => void;
}) {
  return (
    <section
      className="p-6 rounded-[18px]"
      style={{
        background: paused ? "var(--attack-bg)" : "var(--surface)",
        border: paused
          ? "0.5px solid rgba(185,28,28,0.25)"
          : "0.5px solid var(--border-subtle)",
        boxShadow: paused
          ? "0 8px 28px -12px rgba(185,28,28,0.25)"
          : "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <header className="flex items-center gap-2 mb-4">
        <OctagonAlert
          className="w-3.5 h-3.5"
          style={{ color: "var(--attack)" }}
        />
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--attack)" }}
        >
          Kill switch
        </p>
      </header>
      <p
        className="text-[14.5px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {paused
          ? "Agent is paused on-chain."
          : "Halt every future tx in one click."}
      </p>
      <p
        className="text-[12px] leading-[1.5] mb-5"
        style={{ color: "var(--text-tertiary)" }}
      >
        {paused
          ? "All payments refuse until you resume. Squads has already stopped co-signing."
          : "Useful when you spot anomalous activity. Squads will refuse to co-sign anything until you un-pause."}
      </p>
      <button
        onClick={onKillSwitch}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-[12px] text-[13px] font-semibold transition-all active:scale-95"
        style={{
          background: paused ? "var(--success)" : "var(--attack)",
          color: "white",
          boxShadow: paused
            ? "0 6px 18px -6px rgba(34,197,94,0.3)"
            : "0 6px 18px -6px rgba(185,28,28,0.3)",
        }}
      >
        <Power className="w-4 h-4" />
        {paused ? "Resume agent" : "Pause agent"}
      </button>
    </section>
  );
}
