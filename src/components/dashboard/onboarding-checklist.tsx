"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Terminal, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface OnboardingChecklistProps {
  hasEvents: boolean;
}

export function OnboardingChecklist({ hasEvents }: OnboardingChecklistProps) {
  const { apiKeyPrefix } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [steps, setSteps] = useState({
    account: true, // always done if they see this
    copyKey: false,
    integrate: false,
    firstEvent: false,
  });

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pulse-onboarding");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSteps((prev) => ({ ...prev, ...parsed }));
        if (parsed.dismissed) setDismissed(true);
      } catch {
        // ignore
      }
    }
  }, []);

  // Auto-complete step 4 when events arrive
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
    localStorage.setItem("pulse-onboarding", JSON.stringify({ ...steps, dismissed: true }));
  }

  function copyKey() {
    if (apiKeyPrefix) {
      navigator.clipboard.writeText(apiKeyPrefix + "...");
      setCopiedKey(true);
      markStep("copyKey");
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  const allDone = steps.account && steps.copyKey && steps.integrate && steps.firstEvent;

  if (dismissed || allDone) return null;

  const completedCount = [steps.account, steps.copyKey, steps.integrate, steps.firstEvent].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-premium"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight">Get started with Pulse</h3>
          <p className="text-[12px] text-tertiary mt-0.5">
            {completedCount}/4 steps completed
          </p>
        </div>
        <button onClick={dismiss} className="p-1 text-quaternary hover:text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#F0F0F0] rounded-full mb-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / 4) * 100}%` }}
          className="h-full bg-pulse rounded-full"
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="space-y-3">
        {/* Step 1: Account created */}
        <StepItem done={steps.account} label="Account created" icon={Check} />

        {/* Step 2: Copy API key */}
        <div className="flex items-center gap-3">
          <StepCircle done={steps.copyKey} />
          <div className="flex-1 flex items-center justify-between">
            <span className={`text-[13px] ${steps.copyKey ? "text-tertiary line-through" : "text-primary font-medium"}`}>
              Copy your API key
            </span>
            {!steps.copyKey && (
              <button
                onClick={copyKey}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-pulse hover:underline"
              >
                {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedKey ? "Copied" : "Copy key"}
              </button>
            )}
          </div>
        </div>

        {/* Step 3: Integrate middleware */}
        <div className="flex items-center gap-3">
          <StepCircle done={steps.integrate} />
          <div className="flex-1 flex items-center justify-between">
            <span className={`text-[13px] ${steps.integrate ? "text-tertiary line-through" : "text-primary font-medium"}`}>
              Integrate the middleware
            </span>
            {!steps.integrate && (
              <a
                href="/pulse/dashboard/setup"
                onClick={() => markStep("integrate")}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-pulse hover:underline"
              >
                <Terminal className="w-3 h-3" />
                Setup guide
              </a>
            )}
          </div>
        </div>

        {/* Step 4: First event */}
        <div className="flex items-center gap-3">
          <StepCircle done={steps.firstEvent} />
          <div className="flex-1">
            <span className={`text-[13px] ${steps.firstEvent ? "text-tertiary line-through" : "text-primary font-medium"}`}>
              Receive your first x402 payment
            </span>
            {!steps.firstEvent && steps.integrate && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-pulse animate-pulse" />
                <span className="text-[11px] text-tertiary">Waiting for first event...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StepItem({ done, label }: { done: boolean; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      <StepCircle done={done} />
      <span className={`text-[13px] ${done ? "text-tertiary line-through" : "text-primary font-medium"}`}>
        {label}
      </span>
    </div>
  );
}

function StepCircle({ done }: { done: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
      done ? "bg-emerald-500" : "border-2 border-black/[0.1]"
    }`}>
      {done && <Check className="w-3 h-3 text-white" />}
    </div>
  );
}
