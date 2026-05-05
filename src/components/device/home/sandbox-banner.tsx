"use client";

/**
 * SandboxBanner — visible only when /app is being viewed in guest
 * mode (kyvern:dev-wallet present in localStorage AND no Privy auth).
 *
 * Job: kill the perception that /try gives away a free real account.
 * Sandbox devices are ephemeral, tied to a synthetic wallet the user
 * doesn't actually own. Sign-in turns the sandbox into a real device
 * with a recoverable wallet, mintable keys, and deployable workers.
 *
 * The banner sits above the chassis and persists across all three
 * tabs. The "Sign in" CTA triggers Privy via useAuth().signIn().
 */

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function SandboxBanner() {
  const { signIn } = useAuth();
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[12px] px-3.5 py-2.5 mb-3 flex items-center justify-between gap-3 flex-wrap"
      style={{
        background:
          "linear-gradient(180deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 100%)",
        border: "1px solid rgba(245,158,11,0.30)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Sparkles
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={1.8}
          style={{ color: "#B45309" }}
        />
        <div className="min-w-0">
          <div
            className="font-mono uppercase tracking-[0.16em] mb-0.5"
            style={{ fontSize: 9.5, color: "#B45309" }}
          >
            Sandbox mode
          </div>
          <div
            className="text-[12.5px] leading-[1.4] truncate"
            style={{ color: "rgba(146,64,14,0.95)" }}
          >
            This device is ephemeral. Workers, keys, and funds disappear
            when you clear this browser.
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={signIn}
        className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] rounded-full px-3 py-1.5 transition active:scale-[0.97] flex-shrink-0"
        style={{
          fontSize: 10,
          color: "#FFFFFF",
          background: "#0A0A0A",
          border: "1px solid rgba(0,0,0,0.8)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
        }}
      >
        Sign in to keep it
        <ArrowRight className="w-3 h-3" strokeWidth={2} />
      </button>
    </motion.div>
  );
}
