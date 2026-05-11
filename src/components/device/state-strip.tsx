"use client";

/**
 * StateStrip — Phase 6 (Frontier Grand Champion).
 *
 * One-line activation banner that reads the derived `deviceState` and
 * shows context + at most one CTA. Sits between the whisper line and
 * the canvas on /app. Vanishes entirely when state === 'active' so
 * the device home stays clean once the owner is up and running.
 */

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import type { DeviceState } from "@/lib/device-state";

interface Props {
  state: DeviceState;
  /** Override the default funded-default CTA when the user has a worker
   *  to personalize first. Defaults to /app/agents/spawn or the first
   *  default-config worker's detail page. */
  firstUntunedHref?: string | null;
  onTopUp?: () => void;
  className?: string;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function StateStrip({
  state,
  firstUntunedHref,
  onTopUp,
  className,
}: Props) {
  if (state === "active") return null;

  const copy = lineFor(state);
  const cta = ctaFor(state, firstUntunedHref);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.35, ease: EASE }}
        className={`rounded-[12px] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap ${className ?? ""}`}
        style={{
          background: stateBg(state),
          border: `1px solid ${stateBorder(state)}`,
        }}
      >
        <span
          className="text-[12.5px] leading-[1.5]"
          style={{ color: stateText(state) }}
        >
          {copy}
        </span>
        {cta && (
          <CTA
            label={cta.label}
            icon={cta.icon}
            href={cta.href}
            variant={state === "empty" ? "primary" : "ghost"}
            onClick={cta.onClick ? () => onTopUp?.() : undefined}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function lineFor(state: DeviceState): string {
  // TRANSFORM_24H — workers retired. The strip now reinforces the
  // integration-console flow: mint key → run snippet → watch events.
  switch (state) {
    case "empty":
      return "Your worker can earn and spend on Solana — within rules the chain enforces.";
    case "funded_default":
      return "Your worker can earn and spend on Solana — within rules the chain enforces.";
    case "partial":
      return "Integration in progress.";
    case "active":
    default:
      return "";
  }
}

/** CTA labels are TEXT ONLY — leading icon (Plus / ArrowRight) is
 *  rendered by <CTA> from `icon`. Don't prefix with → or + here or
 *  the glyph doubles up (regression flagged 2026-05-08). */
function ctaFor(
  state: DeviceState,
  firstUntunedHref: string | null | undefined,
): {
  label: string;
  icon: "topup" | "arrow";
  href?: string;
  onClick?: boolean;
} | null {
  // firstUntunedHref no longer used (workers retired) but kept as a
  // signature for backward-compat with /app/page.tsx callers.
  void firstUntunedHref;
  switch (state) {
    case "empty":
      return { label: "Top up vault", icon: "topup", onClick: true };
    case "funded_default":
    case "partial":
    case "active":
    default:
      return null;
  }
}

function stateBg(s: DeviceState): string {
  if (s === "empty") return "rgba(245,158,11,0.08)";
  return "rgba(15,23,42,0.03)";
}

function stateBorder(s: DeviceState): string {
  if (s === "empty") return "rgba(245,158,11,0.25)";
  return "rgba(15,23,42,0.08)";
}

function stateText(s: DeviceState): string {
  if (s === "empty") return "#92400E";
  return "#0A0A0A";
}

function CTA({
  label,
  icon,
  href,
  variant,
  onClick,
}: {
  label: string;
  icon: "topup" | "arrow";
  href?: string;
  variant: "primary" | "ghost";
  onClick?: () => void;
}) {
  const styles =
    variant === "primary"
      ? {
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.85)",
        }
      : {
          background: "transparent",
          color: "#0A0A0A",
          border: "1px solid rgba(15,23,42,0.18)",
        };
  const Glyph =
    icon === "topup"
      ? <Plus className="w-3 h-3" strokeWidth={2.5} />
      : <ArrowRight className="w-3 h-3" strokeWidth={2} />;
  const inner = (
    <>
      {Glyph}
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 9.5 }}
      >
        {label}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition active:scale-[0.97]"
        style={styles}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={href ?? "#"}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition active:scale-[0.97]"
      style={styles}
    >
      {inner}
    </Link>
  );
}
