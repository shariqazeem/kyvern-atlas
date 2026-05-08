"use client";

/**
 * AttackWallPreview — condensed Attack Wall for the landing hero.
 *
 * Smaller than the /atlas wall: a single fixed-height column showing
 * the most recent 8-12 failed-tx pills. Auto-scrolls slowly so the
 * column reads as a LIVE adversarial feed, not a static list.
 *
 * Each pill is clickable to Solana Explorer (devnet). The column has
 * a subtle red glow to make it feel like the system is actively
 * fending off attacks. Mobile collapses to a horizontal scroll row.
 */

import { useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { AtlasAttack } from "@/lib/atlas/schema";

interface Props {
  attacks: AtlasAttack[];
  /** How many pills to render. Default 10. */
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

function merchantFor(a: AtlasAttack): string {
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

export function AttackWallPreview({ attacks, limit = 10 }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return [...attacks]
      .sort((a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt))
      .slice(0, limit);
  }, [attacks, limit]);

  // Slow auto-scroll loop. Pauses on hover. Resets to top when the
  // bottom is reached so the wall reads as a continuous tape.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    const onEnter = () => {
      paused = true;
    };
    const onLeave = () => {
      paused = false;
    };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const tick = () => {
      if (!paused) {
        if (el.scrollTop + el.clientHeight + 1 >= el.scrollHeight) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += 0.45;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [rows.length]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      {/* Phase 9 (2026-05-08) — opaque telemetry surface. The previous
          rgba(20,24,36,0.55) translucent fill picked up whatever
          section background sat behind it (often #FAFAFA), washing
          the column into a muddy gray. Now the panel is its own
          confident dark canvas with a faint red rim glow that reads
          as "security feed" without the transparency artifact. */}
      <div
        aria-hidden
        className="absolute -inset-6 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(248,113,113,0.14) 0%, rgba(248,113,113,0) 65%)",
          filter: "blur(28px)",
        }}
      />

      {/* The column */}
      <div
        ref={scrollerRef}
        className="relative rounded-[16px] overflow-y-auto scrollbar-none"
        style={{
          height: 280,
          background:
            "linear-gradient(180deg, #0E1320 0%, #161A26 100%)",
          border: "1px solid rgba(248,113,113,0.22)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.05)",
            "inset 0 0 0 1px rgba(248,113,113,0.06)",
            "0 0 38px rgba(248,113,113,0.08)",
            "0 18px 38px -16px rgba(15,23,42,0.30)",
          ].join(", "),
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Header label */}
        <div
          className="sticky top-0 z-10 px-4 py-2.5 flex items-center justify-between"
          style={{
            background: "linear-gradient(180deg, #161A26 0%, rgba(22,26,38,0.92) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-2">
            <motion.span
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#F87171",
                boxShadow: "0 0 0 3px rgba(248,113,113,0.18)",
              }}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="font-mono uppercase tracking-[0.18em]"
              style={{ color: "rgba(248,113,113,0.85)", fontSize: 10 }}
            >
              Live attack feed
            </span>
          </div>
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{ color: "rgba(255,255,255,0.40)", fontSize: 9.5 }}
          >
            Solana devnet
          </span>
        </div>

        {/* Pills */}
        <div className="px-3 py-3 flex flex-col gap-2">
          {rows.length === 0 && (
            <div
              className="text-center py-10 font-mono"
              style={{ color: "rgba(255,255,255,0.40)", fontSize: 11 }}
            >
              awaiting attacks…
            </div>
          )}
          {rows.map((a) => {
            const sigShort = shortSig(a.failedTxSignature);
            const explorerUrl = a.failedTxSignature
              ? `https://explorer.solana.com/tx/${a.failedTxSignature}?cluster=devnet`
              : null;
            const content = (
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] transition group"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(248,113,113,0.10) 0%, rgba(248,113,113,0.04) 100%)",
                  border: "1px solid rgba(248,113,113,0.22)",
                }}
              >
                <span
                  className="font-mono shrink-0"
                  style={{
                    color: "#F87171",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                  }}
                >
                  ❌ FAILED
                </span>
                <span
                  className="font-mono shrink-0"
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 10.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtTime(a.attemptedAt)}
                </span>
                <span
                  className="font-mono shrink-0"
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 11,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {amountFor(a)}
                </span>
                <span
                  className="font-mono shrink-0"
                  style={{ color: "rgba(255,255,255,0.30)", fontSize: 11 }}
                >
                  →
                </span>
                <span
                  className="font-mono truncate flex-1"
                  style={{ color: "rgba(255,255,255,0.70)", fontSize: 11 }}
                >
                  {merchantFor(a)}
                </span>
                {sigShort && (
                  <span
                    className="font-mono shrink-0 inline-flex items-center gap-0.5"
                    style={{ color: "rgba(134,239,172,0.75)", fontSize: 10 }}
                  >
                    {sigShort}
                    {explorerUrl && (
                      <ExternalLink
                        className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100"
                        strokeWidth={2}
                      />
                    )}
                  </span>
                )}
              </div>
            );
            return explorerUrl ? (
              <a
                key={a.id}
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="block hover:scale-[1.005] transition-transform"
              >
                {content}
              </a>
            ) : (
              <div key={a.id}>{content}</div>
            );
          })}
        </div>
      </div>

      {/* Footer caption */}
      <div
        className="mt-4 text-center font-mono"
        style={{ color: "rgba(255,255,255,0.45)", fontSize: 11.5 }}
      >
        Every red row above is a real failed Solana transaction. Click any
        pill to verify it on the Explorer.
      </div>
    </div>
  );
}
