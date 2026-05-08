"use client";

/**
 * CursorHalo — soft mouse-follow glow for the landing hero.
 *
 * Phase 9 (2026-05-08): adds the "the page is alive" quality you feel
 * on premium marketing sites (Linear, Vercel, Frontier) without any
 * heavy decoration. Renders a single radial-gradient blob that lerps
 * toward the cursor position. Disabled on touch devices (where there's
 * no hover signal) and when the user prefers reduced motion.
 *
 * Usage: drop inside a `position: relative` container. The halo is
 * absolutely-positioned + non-interactive, so it lives behind content.
 */

import { useEffect, useRef } from "react";

interface Props {
  /** Halo color in rgba (multiply against the section background). */
  color?: string;
  /** Halo radius in px. */
  size?: number;
  /** 0..1 — higher = snappier follow (default: 0.18 = silk). */
  responsiveness?: number;
  /** When true, halo only renders on devices with a fine pointer
   *  (mouse / trackpad). Touch devices skip — saves paint. */
  pointerOnly?: boolean;
}

export function CursorHalo({
  color = "rgba(134,239,172,0.22)",
  size = 520,
  responsiveness = 0.18,
  pointerOnly = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0, w: 1, h: 1, set: false });
  const current = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    if (pointerOnly) {
      const fine = window.matchMedia("(pointer: fine)");
      if (!fine.matches) return;
    }

    const measure = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      target.current.w = r.width;
      target.current.h = r.height;
      if (!target.current.set) {
        target.current.x = r.width / 2;
        target.current.y = r.height * 0.4;
        current.current.x = target.current.x;
        current.current.y = target.current.y;
        target.current.set = true;
      }
    };
    measure();
    window.addEventListener("resize", measure);

    const onMove = (e: MouseEvent) => {
      const parent = el.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      target.current.x = e.clientX - r.left;
      target.current.y = e.clientY - r.top;
      target.current.w = r.width;
      target.current.h = r.height;
    };

    const tick = () => {
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      current.current.x += dx * responsiveness;
      current.current.y += dy * responsiveness;
      el.style.transform = `translate(-50%, -50%) translate3d(${current.current.x.toFixed(
        1,
      )}px, ${current.current.y.toFixed(1)}px, 0)`;
      rafId.current = window.requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId.current = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", measure);
      if (rafId.current !== null) window.cancelAnimationFrame(rafId.current);
    };
  }, [responsiveness, pointerOnly]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute z-0"
      style={{
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${color} 0%, rgba(0,0,0,0) 70%)`,
        filter: "blur(40px)",
        willChange: "transform",
        opacity: 0.85,
      }}
    />
  );
}
