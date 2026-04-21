"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <NumberScramble/> — "a new number just landed" moment.
 *
 * Atlas is a live agent. When a decision lands, the on-chain counters
 * update. A quiet static number swap looks like a page refresh. A
 * digit scramble communicates "something happened" without distracting
 * from the number that ends up there. Think Nest thermostat, not
 * slot machine.
 *
 * Usage:
 *   <NumberScramble value={state.totalSettled} format={fmtInt} />
 *   <NumberScramble value={state.totalSpentUsd} format={fmtUsd} duration={650} />
 *
 * Scramble behavior:
 *   · When `value` changes, we scramble the string representation for
 *     `duration` ms, then settle on the real formatted value.
 *   · Scrambling only affects digits — separators, currency symbols,
 *     dots, and commas are passed through untouched. That way `$12.47`
 *     scrambles to `$83.92`, not `X9Y4ZQ`.
 *   · On first render (value=0 → real value), we DO scramble — that's
 *     the hydration moment and it reads as "waking up". On subsequent
 *     renders with the same value we no-op (no churn).
 *   · Respect `prefers-reduced-motion`: if the user asked for less
 *     motion, we skip the scramble entirely and render the final value.
 *
 * Why not Framer Motion's animate-number? Because this isn't a tween
 * from N to M — it's a "digits are being computed" moment. Scramble
 * expresses uncertainty resolving, which is the right metaphor for
 * "the on-chain record just updated".
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react";

export interface NumberScrambleProps {
  /** The current numeric value. */
  value: number;
  /** Formatter to convert value → display string (e.g. `fmtUsd`, `fmtInt`). */
  format?: (n: number) => string;
  /** Scramble duration in ms. Default 520 — long enough to notice, short enough to not annoy. */
  duration?: number;
  /** How often to re-roll scrambled digits during the scramble. Default 50ms. */
  stepMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DIGITS = "0123456789";

function scramble(template: string): string {
  // Replace every digit in `template` with a random digit. Leave
  // everything else (commas, dots, `$`, space, letters) untouched.
  let out = "";
  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
    if (ch >= "0" && ch <= "9") {
      out += DIGITS[Math.floor(Math.random() * 10)];
    } else {
      out += ch;
    }
  }
  return out;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function NumberScramble({
  value,
  format = (n) => String(n),
  duration = 520,
  stepMs = 50,
  className,
  style,
}: NumberScrambleProps) {
  const finalStr = format(value);
  const [display, setDisplay] = useState(finalStr);
  const lastValueRef = useRef<number | null>(null);

  useEffect(() => {
    // First render OR same value — no scramble.
    if (lastValueRef.current === value) {
      setDisplay(finalStr);
      return;
    }
    const isFirst = lastValueRef.current === null;
    lastValueRef.current = value;

    // Reduced motion: skip straight to final.
    if (prefersReducedMotion()) {
      setDisplay(finalStr);
      return;
    }

    // On first render, only scramble if we have something to show.
    if (isFirst && finalStr.length === 0) {
      setDisplay(finalStr);
      return;
    }

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        setDisplay(finalStr);
        return;
      }
      setDisplay(scramble(finalStr));
      timeoutId = window.setTimeout(tick, stepMs);
    };
    let timeoutId = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timeoutId);
  }, [value, finalStr, duration, stepMs]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
