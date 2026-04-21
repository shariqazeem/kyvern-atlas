"use client";

/* ════════════════════════════════════════════════════════════════════
   /app/keys — one page, two kinds of keys.

   · Agent keys (kv_live_…) — minted per vault. Shown on vault creation;
     can only be revealed once. We surface counts + a link to /vault.
   · Service API keys (kv_live_… for Pulse) — per-tenant keys for wrapping
     x402 endpoints. Full management lives in /pulse/dashboard/keys.

   This hub page gives a single answer to "where do my keys live?" and
   then links into the specialized screens.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Key,
  ShieldCheck,
  Wallet,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";

const EASE = [0.25, 0.1, 0.25, 1] as const;

export default function AppKeysPage() {
  return (
    <div className="space-y-7 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="pt-2"
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
          style={{ color: "var(--text-quaternary)" }}
        >
          Shared · credentials
        </p>
        <h1
          className="tracking-[-0.035em] text-balance"
          style={{
            fontSize: "clamp(30px, 4.2vw, 42px)",
            lineHeight: 1.02,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          API keys.
        </h1>
        <p
          className="mt-2 text-[14.5px] leading-[1.55] max-w-[580px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Two kinds of keys live in Kyvern. Agent keys authorize an agent to
          spend from a vault. Service keys authorize your endpoint to capture
          incoming Pulse events. Both are scoped per-wallet, revokable, and
          shown only once.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent keys */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
          className="p-6 rounded-[18px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{ background: "#EEF0FF" }}
            >
              <Wallet className="w-4 h-4" style={{ color: "#4F46E5" }} />
            </div>
            <div>
              <p
                className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "#4F46E5" }}
              >
                Pay side · Agent keys
              </p>
              <h3
                className="text-[17px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                One key per vault
              </h3>
            </div>
          </div>
          <p
            className="text-[13px] leading-[1.55] mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Agent keys are minted when you create a vault and delegated into
            the Squads spending limit as a member. Keep them out of repos —
            they&apos;re the last mile of your agent&apos;s spend authority.
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] mb-4"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <ShieldCheck className="w-3 h-3" style={{ color: "#16a34a" }} />
            <span
              className="text-[11.5px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Revealed ONCE at vault creation. Rotate via the vault dashboard.
            </span>
          </div>
          <Link
            href="/vault"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#4F46E5", color: "white" }}
          >
            Go to your vaults
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* Service API keys */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="p-6 rounded-[18px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{ background: "#E8F4FE" }}
            >
              <Globe className="w-4 h-4" style={{ color: "#0EA5E9" }} />
            </div>
            <div>
              <p
                className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "#0EA5E9" }}
              >
                Service keys
              </p>
              <h3
                className="text-[17px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                One key per service
              </h3>
            </div>
          </div>
          <p
            className="text-[13px] leading-[1.55] mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Service keys authorize your x402 endpoint to report payment events
            into Pulse. Drop the key into <code className="code-inline">withPulse({"{ apiKey }"})</code>
            {" "}and every inbound payment shows up here seconds after it lands.
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] mb-4"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <Key className="w-3 h-3" style={{ color: "#0EA5E9" }} />
            <span
              className="text-[11.5px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Store as <code className="code-inline">KYVERNLABS_PULSE_KEY</code>. Rotate
              anytime.
            </span>
          </div>
          <Link
            href="/pulse/dashboard/keys"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#0EA5E9", color: "white" }}
          >
            Manage service keys
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
