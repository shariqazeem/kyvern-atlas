"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <KyvernMark/> — the shared "K" logo tile.
 *
 * This is the single component that renders the Kyvern "K" tile
 * anywhere it appears (navbar, wizard chooser, wizard header, the
 * favicon surrogate inside the app). Having it live in ONE place
 * means:
 *
 *   1. Every surface uses the same size / radius / color story.
 *   2. We can give it a stable `layoutId` for Framer motion shared-
 *      element transitions WITHIN a page (e.g. when a modal promotes
 *      the navbar K into a hero position).
 *   3. We can give it a stable `view-transition-name` for the browser-
 *      native cross-route morphs — evergreen Chromium 111+ / Safari
 *      18+ / Firefox (flagged). Any user on those browsers sees the
 *      K visually transport between /, /vault/new, and /vault/[id]
 *      during route changes. Others see a clean fade-in. Zero harm.
 *
 * Usage:
 *   <KyvernMark size={28} />           // default
 *   <KyvernMark size={32} layoutId />  // opts into Framer layout id
 *
 * The `layoutId` prop defaults to true so the view-transition-name
 * is always applied. Pass `layoutId={false}` on pages where you
 * intentionally want multiple Ks (duplicate-id warnings otherwise).
 * ════════════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";

export interface KyvernMarkProps {
  /** Tile edge in px. Default 28 (matches current navbar). */
  size?: number;
  /** Radius in px. Default = size * 0.32 — close to the app's 8-10px norm. */
  radius?: number;
  /**
   * Whether this instance participates in the shared-element morph.
   * Default true. Set false if you need to render multiple Ks on the
   * same page (e.g. side-by-side comparison in a case study) to avoid
   * duplicate view-transition-name errors.
   */
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
  // Letter size roughly scales with the tile — 46% of edge feels right
  // across 24px (badge) and 40px (hero).
  const letterSize = Math.round(size * 0.46);

  const viewTransitionName = layoutId ? "kyvern-mark" : undefined;

  return (
    <motion.div
      // layoutId is a no-op across Next App Router route changes (each
      // route unmounts) but it WORKS for layout reshuffles within a
      // page — e.g. when a sticky header collapses or a modal opens.
      // The view-transition-name below is what actually morphs across
      // routes on supporting browsers.
      layoutId={layoutId ? "kyvern-mark" : undefined}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        viewTransitionName,
      }}
      // Subtle entrance — if the browser supports view-transitions we
      // skip our own animation (the browser is doing the morph); else
      // the K scales in from 0.88 so it lands with presence.
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <span
        style={{
          color: "white",
          fontSize: letterSize,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        K
      </span>
    </motion.div>
  );
}
