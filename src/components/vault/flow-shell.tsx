"use client";

/* ════════════════════════════════════════════════════════════════════
   FlowShell — the chrome that wraps every step of /vault/new.

   · KyvernLabs mark on the left, step counter on the right
   · Linear progress rail under the chrome, glides to the next step
   · AnimatePresence crossfade+slide between children
   · Back button on the left of the footer, primary CTA on the right
   · Fully keyboard friendly (Enter submits, Esc goes back)
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, type ReactNode } from "react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export interface FlowShellProps {
  stepIndex: number;           // 0-based
  stepCount: number;
  title: string;               // shown above content
  subtitle?: string;
  eyebrow?: string;            // small label above title
  canContinue: boolean;
  continueLabel?: string;
  onBack?: () => void;
  onContinue: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
}

export function FlowShell({
  stepIndex,
  stepCount,
  title,
  subtitle,
  eyebrow,
  canContinue,
  continueLabel,
  onBack,
  onContinue,
  secondaryAction,
  children,
}: FlowShellProps) {
  const progress = ((stepIndex + 1) / stepCount) * 100;

  // Enter submits, Esc goes back
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (e.key === "Enter" && !isInput && canContinue) {
        e.preventDefault();
        onContinue();
      }
      if (e.key === "Escape" && onBack) {
        e.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canContinue, onContinue, onBack]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* ─── Chrome: brand + step counter ─── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(250,250,250,0.72)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link
            href="/app"
            className="group flex items-center gap-2 transition-opacity hover:opacity-80"
            aria-label="Back to app"
          >
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{ background: "var(--text-primary)" }}
            >
              <span className="text-white text-[13px] font-bold tracking-tight">
                K
              </span>
            </div>
            <span
              className="hidden sm:inline text-[14.5px] font-semibold"
              style={{
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Kyvern
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Micro step dots — smaller, quieter, less hardware-y */}
            <div className="flex items-center gap-1">
              {Array.from({ length: stepCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    width: i === stepIndex ? 18 : 6,
                    opacity:
                      i === stepIndex ? 1 : i < stepIndex ? 0.8 : 0.3,
                  }}
                  transition={{ duration: 0.5, ease }}
                  className="h-1 rounded-full"
                  style={{
                    background:
                      i <= stepIndex
                        ? "var(--text-primary)"
                        : "var(--text-quaternary)",
                  }}
                />
              ))}
            </div>
            <span
              className="text-[11.5px] font-medium font-mono-numbers tabular-nums"
              style={{ color: "var(--text-quaternary)" }}
            >
              {String(stepIndex + 1).padStart(2, "0")}
              <span style={{ opacity: 0.6 }}>
                {" / "}
                {String(stepCount).padStart(2, "0")}
              </span>
            </span>
          </div>
        </div>

        {/* Thin animated progress rail */}
        <div
          className="h-px w-full"
          style={{ background: "var(--border-subtle)" }}
        >
          <motion.div
            className="h-px"
            style={{ background: "var(--text-primary)" }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease }}
          />
        </div>
      </header>

      {/* ─── Step content ─── */}
      <main className="flex-1 w-full">
        <div className="max-w-[620px] mx-auto px-6 lg:px-8 pt-20 lg:pt-28 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease }}
            >
              {eyebrow && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05, ease }}
                  className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-5"
                  style={{ color: "var(--text-quaternary)" }}
                >
                  {eyebrow}
                </motion.p>
              )}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1, ease }}
                className="text-balance"
                style={{
                  color: "var(--text-primary)",
                  letterSpacing: "-0.035em",
                  lineHeight: 1.02,
                  fontSize: "clamp(36px, 5.5vw, 54px)",
                  fontWeight: 500,
                }}
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease }}
                  className="mt-5 text-[17px] leading-[1.55] text-balance max-w-[560px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {subtitle}
                </motion.p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.3, ease }}
                className="mt-12"
              >
                {children}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ─── Footer CTA row ─── */}
      <footer
        className="sticky bottom-0 z-40"
        style={{
          background: "rgba(250,250,250,0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderTop: "0.5px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-[620px] mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack ? (
              <button
                onClick={onBack}
                className="group inline-flex items-center gap-1.5 h-11 px-4 rounded-[12px] text-[14px] font-medium transition-colors duration-200 hover:bg-[var(--surface-2)]"
                style={{ color: "var(--text-secondary)" }}
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                Back
                <kbd
                  className="hidden sm:inline-flex items-center justify-center h-4 w-4 ml-1 rounded text-[9px] font-mono"
                  style={{
                    background: "var(--surface-2)",
                    border: "0.5px solid var(--border-subtle)",
                    color: "var(--text-quaternary)",
                  }}
                >
                  ␛
                </kbd>
              </button>
            ) : (
              <span />
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="h-11 px-4 rounded-[12px] text-[14px] font-medium transition-colors duration-200 hover:text-[color:var(--text-primary)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>

          <button
            onClick={onContinue}
            disabled={!canContinue}
            className="group inline-flex items-center gap-2 h-11 px-5 rounded-[12px] text-[14px] font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:transform-none"
            style={{
              background: canContinue
                ? "var(--text-primary)"
                : "var(--surface-3)",
              color: canContinue ? "var(--background)" : "var(--text-tertiary)",
              cursor: canContinue ? "pointer" : "not-allowed",
              boxShadow: canContinue
                ? "0 1px 2px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.12)"
                : "none",
            }}
          >
            {continueLabel ?? "Continue"}
            {stepIndex === stepCount - 1 ? (
              <Check className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            )}
            <kbd
              className="hidden sm:inline-flex items-center justify-center h-4 px-1 ml-1 rounded text-[9px] font-mono"
              style={{
                background: canContinue
                  ? "rgba(255,255,255,0.14)"
                  : "var(--surface-2)",
                color: canContinue
                  ? "rgba(255,255,255,0.65)"
                  : "var(--text-quaternary)",
              }}
            >
              ⏎
            </kbd>
          </button>
        </div>
      </footer>
    </div>
  );
}
