"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <ActivityFeed/> — the vault's payments ledger.
 *
 * Every attempt — settled, allowed, blocked, failed. Three-column
 * row layout (icon · primary line · amount + tx link). New rows land
 * with a brief indigo-wash entrance so polling-arrived payments
 * visibly "arrive" instead of popping in.
 *
 * Extracted from src/app/vault/[id]/page.tsx so multiple tabs can
 * reuse it without circular imports.
 * ════════════════════════════════════════════════════════════════════
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink, OctagonAlert, ShieldCheck, Zap } from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import type { Payment, Vault } from "./types";

export interface ActivityFeedProps {
  payments: Payment[];
  vault: Vault;
  /** Header variant. 'card' = self-contained card with header; 'bare' = just the list, for embedding in tabs that own their own header. */
  variant?: "card" | "bare";
}

export function ActivityFeed({
  payments,
  vault,
  variant = "card",
}: ActivityFeedProps) {
  const body =
    payments.length === 0 ? (
      <EmptyState />
    ) : (
      <ul className="divide-y divide-[#F4F4F5]">
        <AnimatePresence initial={false}>
          {payments.map((p, i) => (
            <motion.li
              key={p.id}
              layout
              initial={
                i < 5
                  ? { opacity: 0, y: -8, backgroundColor: "rgba(79,70,229,0.08)" }
                  : false
              }
              animate={{
                opacity: 1,
                y: 0,
                backgroundColor: "rgba(79,70,229,0)",
              }}
              transition={{
                duration: 0.55,
                ease: EASE,
                backgroundColor: { duration: 1.6, ease: EASE },
              }}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-3 hover:bg-[#FAFAFA]"
            >
              <PaymentIcon status={p.status} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {p.merchant}
                  </span>
                  {p.status === "blocked" && p.reason && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--attack-bg)",
                        color: "var(--attack)",
                      }}
                    >
                      {p.reason}
                    </span>
                  )}
                  {p.status === "failed" && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--warning-bg)",
                        color: "var(--warning)",
                      }}
                    >
                      failed
                    </span>
                  )}
                </div>
                <div
                  className="mt-0.5 flex items-center gap-2 text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <span>{relTime(p.createdAt)}</span>
                  {p.memo && (
                    <>
                      <span>·</span>
                      <span className="truncate italic">
                        &ldquo;{p.memo}&rdquo;
                      </span>
                    </>
                  )}
                  {p.latencyMs !== null && (
                    <>
                      <span>·</span>
                      <span>{p.latencyMs}ms</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={
                    p.status === "blocked"
                      ? "text-[14px] font-semibold line-through"
                      : "text-[14px] font-semibold"
                  }
                  style={{
                    color:
                      p.status === "blocked"
                        ? "var(--text-tertiary)"
                        : "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  ${p.amountUsd.toFixed(2)}
                </span>
                {p.txSignature && (
                  <a
                    href={explorerUrl(p.txSignature, vault.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-[10px] hover:underline"
                    style={{ color: "var(--agent)" }}
                  >
                    view tx <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );

  if (variant === "bare") return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      className="overflow-hidden rounded-[22px] bg-white"
      style={{
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.03)",
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Activity</h3>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Every attempt, allowed or refused. Live.
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--success)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          Live
        </div>
      </div>
      {body}
    </motion.div>
  );
}

export function PaymentIcon({ status }: { status: Payment["status"] }) {
  if (status === "settled" || status === "allowed") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: "var(--success-bg)" }}
      >
        <Check className="h-4 w-4" style={{ color: "var(--success-deep)" }} />
      </div>
    );
  }
  if (status === "blocked") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: "var(--attack-bg)" }}
      >
        <ShieldCheck className="h-4 w-4" style={{ color: "var(--attack)" }} />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: "var(--warning-bg)" }}
      >
        <OctagonAlert className="h-4 w-4" style={{ color: "var(--warning)" }} />
      </div>
    );
  }
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ background: "var(--surface-2)" }}
    >
      <Zap className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-14 text-center">
      <div
        className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "var(--surface-2)" }}
      >
        <ShieldCheck
          className="h-5 w-5"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        Nothing to show yet.
      </p>
      <p
        className="mt-1 text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        The moment your agent makes its first payment, it will appear here.
      </p>
    </div>
  );
}

/* ─── Shared helpers (formerly inline in page.tsx) ─────────────── */

function relTime(iso: string) {
  try {
    const d =
      iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso)
        ? new Date(iso)
        : new Date(iso.replace(" ", "T") + "Z");
    const diffMs = Date.now() - d.getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function explorerUrl(sig: string, network: "devnet" | "mainnet") {
  return `https://explorer.solana.com/tx/${sig}?cluster=${network}`;
}
