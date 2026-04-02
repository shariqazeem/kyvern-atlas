"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [position, setPosition] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setPosition(data.position || null);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] font-medium text-emerald-700"
          >
            <Check className="w-4 h-4" />
            You&apos;re in{position ? ` — #${position} on the list` : ""}. We&apos;ll be in touch.
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex items-center gap-2"
          >
            <div className="flex-1 relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full h-11 px-4 rounded-lg border border-black/[0.08] bg-white text-[13px] text-primary placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20 focus:border-pulse/30 transition-all duration-200"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="group inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors duration-300 shrink-0"
            >
              {status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Get Early Access
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {status !== "success" && (
        <p className="mt-2.5 text-center text-[11px] text-quaternary">
          First 50 get Pulse Pro free for 3 months. No spam.
        </p>
      )}
    </div>
  );
}
