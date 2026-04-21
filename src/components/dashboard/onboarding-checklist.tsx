"use client";

/**
 * OnboardingChecklist — "Get started with Pulse" panel.
 *
 * Apple-grade rewrite. Fixes two real issues:
 *
 *   1. The copy-key button only copied the *prefix* (`kv_live_LjlC`) because
 *      the full key is shown ONCE at creation and not persisted. When the
 *      user came back later and clicked "Copy key", the clipboard got the
 *      truncated preview. We now only show the copy button when the full
 *      key is actually in memory; otherwise we send them to the keys page
 *      where they can rotate and see a fresh full key.
 *
 *   2. The visual language didn't match the /app design system. Rewritten
 *      with token-driven colors, consistent spacing with /app/*, and
 *      staggered enters that feel like the rest of the product.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Key,
  Terminal,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface OnboardingChecklistProps {
  hasEvents: boolean;
}

// Quick sanity check — a real kv_live key is ~40+ chars. Anything shorter
// is almost certainly the masked prefix.
function looksLikeFullKey(k: string | null | undefined): boolean {
  return typeof k === "string" && k.startsWith("kv_live_") && k.length >= 24;
}

export function OnboardingChecklist({ hasEvents }: OnboardingChecklistProps) {
  const { apiKey } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [steps, setSteps] = useState({
    account: true,
    copyKey: false,
    integrate: false,
    firstEvent: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("pulse-onboarding");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSteps((prev) => ({ ...prev, ...parsed }));
        if (parsed.dismissed) setDismissed(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (hasEvents && !steps.firstEvent) {
      setSteps((prev) => {
        const updated = { ...prev, firstEvent: true };
        localStorage.setItem("pulse-onboarding", JSON.stringify(updated));
        return updated;
      });
    }
  }, [hasEvents, steps.firstEvent]);

  function markStep(step: "copyKey" | "integrate") {
    setSteps((prev) => {
      const updated = { ...prev, [step]: true };
      localStorage.setItem("pulse-onboarding", JSON.stringify(updated));
      return updated;
    });
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(
      "pulse-onboarding",
      JSON.stringify({ ...steps, dismissed: true }),
    );
  }

  async function copyKey() {
    if (!looksLikeFullKey(apiKey)) return;
    try {
      await navigator.clipboard.writeText(apiKey!);
      setCopied(true);
      markStep("copyKey");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  const allDone =
    steps.account && steps.copyKey && steps.integrate && steps.firstEvent;
  if (dismissed || allDone) return null;

  const done = [steps.account, steps.copyKey, steps.integrate, steps.firstEvent].filter(Boolean).length;
  const fullKeyAvailable = looksLikeFullKey(apiKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -36px rgba(14,165,233,0.14)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "#0EA5E9" }}
          >
            Get started · {done}/4
          </p>
          <h3
            className="text-[17px] font-semibold tracking-[-0.015em] mt-0.5"
            style={{ color: "var(--text-primary)" }}
          >
            Four steps to your first on-chain payment.
          </h3>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss onboarding"
          className="p-1.5 rounded-[8px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-quaternary)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress rail */}
      <div
        className="mx-6 h-[2px] rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          initial={false}
          animate={{ width: `${(done / 4) * 100}%` }}
          transition={{ duration: 0.7, ease }}
          className="h-full rounded-full"
          style={{ background: "#0EA5E9" }}
        />
      </div>

      <ul className="px-6 py-5 space-y-3">
        <StepRow done={steps.account} label="Account created" />

        <StepRow
          done={steps.copyKey}
          label="Copy your API key"
          action={
            fullKeyAvailable ? (
              <button
                onClick={copyKey}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px] text-[11.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--text-primary)" }}
              >
                {copied ? (
                  <Check
                    className="w-3 h-3"
                    style={{ color: "var(--success)" }}
                  />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied" : "Copy key"}
              </button>
            ) : (
              <Link
                href="/pulse/dashboard/keys"
                onClick={() => markStep("copyKey")}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px] text-[11.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--text-primary)" }}
              >
                <Key className="w-3 h-3" />
                Reveal or rotate
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            )
          }
          hint={
            !fullKeyAvailable && !steps.copyKey
              ? "Full keys are shown once at creation. Rotate to see a fresh one."
              : undefined
          }
        />

        <StepRow
          done={steps.integrate}
          label="Integrate the middleware"
          action={
            <Link
              href="/pulse/dashboard/setup"
              onClick={() => markStep("integrate")}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px] text-[11.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text-primary)" }}
            >
              <Terminal className="w-3 h-3" />
              Setup guide
              <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />

        <StepRow
          done={steps.firstEvent}
          label="Receive your first x402 payment"
          hint={
            !steps.firstEvent && steps.integrate
              ? "Waiting for first event…"
              : undefined
          }
        />
      </ul>
    </motion.div>
  );
}

function StepRow({
  done,
  label,
  action,
  hint,
}: {
  done: boolean;
  label: string;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <StepCircle done={done} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[13.5px]"
            style={{
              color: done ? "var(--text-tertiary)" : "var(--text-primary)",
              fontWeight: done ? 400 : 500,
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {label}
          </span>
          {!done && action}
        </div>
        {hint && !done && (
          <p
            className="mt-1 text-[11.5px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {hint}
          </p>
        )}
      </div>
    </li>
  );
}

function StepCircle({ done }: { done: boolean }) {
  return (
    <span
      className="inline-flex w-5 h-5 rounded-full items-center justify-center shrink-0 mt-[1px]"
      style={{
        background: done ? "var(--success)" : "transparent",
        border: done ? "none" : "1.5px solid var(--border-2)",
      }}
    >
      {done && (
        <Check className="w-3 h-3" color="white" strokeWidth={3} />
      )}
    </span>
  );
}
