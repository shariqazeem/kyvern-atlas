"use client";

/**
 * ConnectGate — one gate for the entire Kyvern app.
 *
 * Minimal, Apple-grade. No dual-product branding. No trust badges
 * cluttering the first impression. Just a single handshake: your
 * wallet, our app. When it's not ready, a quiet spinner. When it's
 * ready, we step out of the way.
 */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.16, 1, 0.3, 1] as const;

export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, signIn } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--text-primary)",
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[72vh] px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="max-w-[420px] w-full text-center"
        >
          {/* Tiny monogram — one pixel of identity, nothing more */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="w-10 h-10 rounded-[12px] mx-auto mb-10 flex items-center justify-center"
            style={{ background: "var(--text-primary)" }}
          >
            <span
              className="text-[16px] font-bold tracking-tight"
              style={{ color: "var(--background)" }}
            >
              K
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="text-[34px] md:text-[38px] leading-[1.05] tracking-[-0.035em] mb-3"
            style={{ fontWeight: 600 }}
          >
            Welcome back.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="text-[15px] leading-[1.55] mb-10"
            style={{ color: "var(--text-tertiary)" }}
          >
            One wallet opens both sides of agent commerce on Solana.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease }}
            onClick={signIn}
            className="group inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[12px] text-[14px] font-semibold w-full sm:w-auto transition-opacity hover:opacity-90"
            style={{
              background: "var(--text-primary)",
              color: "var(--background)",
            }}
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6 text-[12px]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Wallet, email, or Google — whichever you prefer.
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
