"use client";

/**
 * <KyvernMark/> — the shared Kyvern logo tile.
 *
 * Renders the official KV brandmark from `/kyvernlabs_logo.jpg`. This
 * is the single component that puts the logo anywhere it appears
 * (navbar, wizard chooser, wizard header, the in-app status bar).
 * Having it live in ONE place means:
 *
 *   1. Every surface uses the same size / radius / asset.
 *   2. Stable `view-transition-name` for browser-native cross-route
 *      morphs (evergreen Chromium 111+ / Safari 18+ / Firefox flagged).
 *      Other browsers fall back to a clean fade-in.
 *
 * Usage:
 *   <KyvernMark size={28} />            // default
 *   <KyvernMark size={32} layoutId />   // opts into Framer layout id
 *
 * `layoutId` defaults to true; set false on pages with multiple Ks
 * (e.g. side-by-side comparisons) to avoid duplicate-id warnings.
 */

import Image from "next/image";
import { motion } from "framer-motion";

export interface KyvernMarkProps {
  /** Tile edge in px. Default 28 (matches navbar). */
  size?: number;
  /** Radius in px. Default = size * 0.32. */
  radius?: number;
  /** Whether this instance participates in the shared-element morph. */
  layoutId?: boolean;
  /** Pass-through className for one-off tweaks. */
  className?: string;
}

export function KyvernMark({
  size = 28,
  radius,
  layoutId = true,
  className,
}: KyvernMarkProps) {
  const r = radius ?? Math.round(size * 0.32);
  const viewTransitionName = layoutId ? "kyvern-mark" : undefined;

  return (
    <motion.div
      layoutId={layoutId ? "kyvern-mark" : undefined}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: "hidden",
        flexShrink: 0,
        viewTransitionName,
        // Subtle bezel + drop shadow so the dark logo sits well on light
        // surfaces; on dark surfaces the shadow is invisible. No effect on
        // the logo itself.
        boxShadow:
          "0 1px 1px rgba(15,23,42,0.05), 0 4px 8px -4px rgba(15,23,42,0.10)",
      }}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <Image
        src="/kyvernlabs_logo.jpg"
        alt="Kyvern"
        width={size}
        height={size}
        priority
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          display: "block",
        }}
      />
    </motion.div>
  );
}
