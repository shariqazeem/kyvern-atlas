"use client";

/**
 * The Attack Wall — /atlas's killer visual.
 *
 * A vertical scrolling column of red pills, each one a real failed
 * Solana transaction. Format:
 *
 *   ❌ FAILED · 14:31:22 · $47.00 → drainer.app · 3kR8…mN4v ↗
 *
 * Each pill is clickable to Solana Explorer (devnet). When new attacks
 * land via polling, fresh rows slide in from the top with a 250ms fade
 * using the standard cubic-bezier(0.16, 1, 0.3, 1) entrance ease.
 *
 * No filters. No pagination. The wall *is* the demo — it reads like a
 * security log, the way a museum exhibit reads like history.
 */

import { useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { AtlasAttack } from "@/lib/atlas/schema";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface AttackWallProps {
  attacks: AtlasAttack[];
  /** Cap visible rows. Defaults to 60 — enough to feel infinite, cheap to render. */
  limit?: number;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function shortSig(sig: string | null): string | null {
  if (!sig) return null;
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

/** Pretty merchant label from attack metadata. The runner stores the
 *  blocked target in `description`; we extract a short host-style label
 *  if it looks like one, else fall back to the attack `type`. */
function merchantFor(a: AtlasAttack): string {
  // Try to pull a domain-style token from description first
  const m = a.description?.match(/[a-zA-Z0-9-]+\.(?:xyz|app|io|com|net|sol|finance|fund)/i);
  if (m) return m[0];
  switch (a.type) {
    case "rogue_merchant":
      return "rogue-merchant";
    case "over_cap":
      return "over-cap";
    case "missing_memo":
      return "missing-memo";
    case "prompt_injection":
      return "prompt-injection";
    default:
      return "unknown";
  }
}

/** Try to extract an attempted dollar amount from description; if not
 *  there, fall back to a stable but type-consistent placeholder so the
 *  pill still reads as money. */
function amountFor(a: AtlasAttack): string {
  const m = a.description?.match(/\$([\d,.]+)/);
  if (m) return `$${m[1]}`;
  switch (a.type) {
    case "over_cap":
      return "$> cap";
    case "rogue_merchant":
      return "$0.10";
    default:
      return "$—";
  }
}

export function AttackWall({ attacks, limit = 60 }: AttackWallProps) {
  const seenRef = useRef<Set<string>>(new Set());

  // Slice and sort newest first
  const rows = useMemo(() => {
    const sorted = [...attacks].sort(
      (a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt),
    );
    return sorted.slice(0, limit);
  }, [attacks, limit]);

  return (
    <section
      className="rounded-[16px] overflow-hidden"
      style={{
        background: "rgba(8,11,20,0.55)",
        border: "1px solid rgba(248,113,113,0.12)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      {/* Wall header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#F87171", boxShadow: "0 0 0 3px rgba(248,113,113,0.18)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase"
            style={{
              color: "rgba(248,113,113,0.85)",
              fontSize: "11px",
              letterSpacing: "0.14em",
            }}
          >
            Attack wall
          </span>
        </div>
        <span
          className="font-mono"
          style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}
        >
          {rows.length} most recent · refused on-chain
        </span>
      </div>

      {/* Rows */}
      <div
        className="overflow-y-auto"
        style={{
          maxHeight: 520,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.12) transparent",
        }}
      >
        {rows.length === 0 ? (
          <div
            className="px-5 py-10 font-mono text-center"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}
          >
            No attacks logged yet — Atlas is undisturbed.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((a, idx) => {
              const isNew = !seenRef.current.has(a.id);
              seenRef.current.add(a.id);
              const sig = shortSig(a.failedTxSignature);
              const explorerHref = a.failedTxSignature
                ? `https://explorer.solana.com/tx/${a.failedTxSignature}?cluster=devnet`
                : null;
              const Inner = explorerHref ? "a" : "div";
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={isNew ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: isNew ? Math.min(idx, 5) * 0.06 : 0,
                    ease: EASE,
                  }}
                >
                  <Inner
                    {...(explorerHref
                      ? { href: explorerHref, target: "_blank", rel: "noreferrer" }
                      : {})}
                    className="flex items-center gap-2 px-5 py-2.5 font-mono text-[12px] hover:bg-white/[0.02] transition border-b last:border-b-0"
                    style={{
                      color: "rgba(255,255,255,0.78)",
                      borderColor: "rgba(255,255,255,0.04)",
                      cursor: explorerHref ? "pointer" : "default",
                    }}
                  >
                    <span style={{ color: "#FCA5A5" }}>❌</span>
                    <span style={{ color: "#FCA5A5" }}>FAILED</span>
                    <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
                    <span style={{ color: "rgba(255,255,255,0.55)" }}>
                      {fmtTime(a.attemptedAt)}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
                    <span style={{ color: "rgba(255,255,255,0.85)" }}>{amountFor(a)}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>
                      {merchantFor(a)}
                    </span>
                    {sig && (
                      <>
                        <span
                          className="ml-auto"
                          style={{ color: "rgba(255,255,255,0.18)" }}
                        >
                          ·
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{sig}</span>
                        {explorerHref && (
                          <ExternalLink
                            className="w-2.5 h-2.5"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          />
                        )}
                      </>
                    )}
                  </Inner>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
