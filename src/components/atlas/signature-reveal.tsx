"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 *  <SignatureReveal/> — character-by-character typewriter reveal for
 *  Solana transaction signatures.
 *
 *  All three of our external design reviewers (GLM, Gemini, Claude)
 *  independently converged on this micro-interaction as the single
 *  highest-leverage upgrade: Kyvern's entire thesis is that every
 *  event is a real on-chain receipt, so signatures should feel like
 *  they're being PRINTED onto the chain in real time.
 *
 *  Behaviour:
 *    · Mounts → types the signature one char at a time, default 22ms/char
 *    · ~1.4s for a typical 64-char base58 signature (fast enough to feel
 *      intentional, slow enough to be watchable)
 *    · Renders as a clickable Solana Explorer link once fully typed
 *    · Idempotent: if `signature` changes mid-animation, restarts cleanly
 *    · Respects `prefers-reduced-motion` — shows the full sig instantly
 *
 *  Visual contract:
 *    · JetBrains Mono (inherited from parent; we don't set font here)
 *    · A subtle underscore blinks at the caret position while typing
 *    · No wrapping: truncates visually with an "open in explorer" icon
 *
 *  Usage:
 *    <SignatureReveal
 *      signature="4YmhrgysrkRjyTdkCot..."
 *      network="devnet"
 *      truncate={18}          // show "4YmhrgysrkRjyTdkCot…1b23"
 *    />
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

export interface SignatureRevealProps {
  signature: string;
  /** Devnet or mainnet — used to build the Explorer URL. */
  network?: "devnet" | "mainnet";
  /** ms per character. Default 22ms feels like a working terminal. */
  speedMs?: number;
  /**
   * Visually truncate to N chars on each side (…middle). The typewriter
   * animation types over the FULL signature but we render truncated for
   * horizontal discipline. 0 or undefined = full signature visible.
   */
  truncate?: number;
  /** Show an "Explorer" arrow to the right once fully revealed. */
  withExplorerLink?: boolean;
  /** Skip the typewriter — show full signature immediately. */
  instant?: boolean;
  className?: string;
  /** Optional className applied to just the mono text. */
  textClassName?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function truncateForDisplay(full: string, edge: number): string {
  if (!edge || full.length <= edge * 2 + 1) return full;
  return `${full.slice(0, edge)}…${full.slice(-4)}`;
}

export function SignatureReveal({
  signature,
  network = "devnet",
  speedMs = 22,
  truncate = 0,
  withExplorerLink = true,
  instant = false,
  className,
  textClassName,
}: SignatureRevealProps) {
  const [typed, setTyped] = useState<string>(() =>
    instant || prefersReducedMotion() ? signature : "",
  );
  const sigRef = useRef(signature);

  useEffect(() => {
    // If the signature itself changed, restart the typewriter.
    if (sigRef.current === signature && typed.length === signature.length) return;
    sigRef.current = signature;

    if (instant || prefersReducedMotion()) {
      setTyped(signature);
      return;
    }

    setTyped("");
    let idx = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      idx += 1;
      setTyped(signature.slice(0, idx));
      if (idx < signature.length) {
        setTimeout(tick, speedMs);
      }
    };
    // Kick off next frame so mount animations don't overlap.
    const first = setTimeout(tick, 40);
    return () => {
      cancelled = true;
      clearTimeout(first);
    };
    // We deliberately don't depend on `typed` — that would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, speedMs, instant]);

  const complete = typed.length === signature.length;
  const display = truncate ? truncateForDisplay(typed, truncate) : typed;
  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;

  const Inner = (
    <>
      <span
        className={textClassName}
        style={{
          fontFamily:
            "var(--font-mono, 'JetBrains Mono', 'SF Mono', Menlo, monospace)",
          fontVariantLigatures: "none",
          letterSpacing: "0.01em",
        }}
      >
        {display}
      </span>
      {!complete && (
        <span
          className="ml-[1px] inline-block animate-pulse"
          aria-hidden
          style={{
            fontFamily:
              "var(--font-mono, 'JetBrains Mono', 'SF Mono', Menlo, monospace)",
            color: "currentColor",
            opacity: 0.5,
          }}
        >
          ▍
        </span>
      )}
      {complete && withExplorerLink && (
        <ArrowUpRight
          className="ml-1 w-3 h-3 inline-block opacity-60"
          aria-hidden
        />
      )}
    </>
  );

  if (!withExplorerLink) {
    return <span className={className}>{Inner}</span>;
  }

  // Until typing finishes, the link is inert — we don't want folks
  // click-jacking a half-typed signature.
  if (!complete) {
    return (
      <span
        className={className}
        aria-label={`Revealing transaction signature`}
      >
        {Inner}
      </span>
    );
  }

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="Verify on Solana Explorer"
    >
      {Inner}
    </a>
  );
}
