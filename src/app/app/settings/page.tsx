"use client";

/* ════════════════════════════════════════════════════════════════════
   /app/settings — lightweight settings hub.

   Shows the connected wallet, the cluster the whole app talks to, and a
   pointer out to Pulse's deeper settings (billing, webhooks, alerts)
   for users who want the advanced surface.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Copy,
  Check,
  LogOut,
  Bell,
  Webhook,
  CreditCard,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const EASE = [0.25, 0.1, 0.25, 1] as const;

export default function AppSettingsPage() {
  const { wallet, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  /**
   * Sign out button handler. Actual sign-out + redirect is done inside
   * useAuth's `signOut()` — see the hook for why the redirect happens
   * there instead of here. This wrapper exists just to drive the
   * `signingOut` state so the button shows a proper label.
   */
  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut?.();
    } catch {
      /* ignore — hook hard-redirects regardless */
    }
  };

  const copyWallet = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

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
          Shared · account
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
          Settings.
        </h1>
      </motion.div>

      {/* Account */}
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
        <h2
          className="text-[16px] font-semibold tracking-tight mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingRow label="Connected wallet">
            {wallet ? (
              <button
                onClick={copyWallet}
                className="group inline-flex items-center gap-1.5 font-mono text-[12.5px] transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                <span>{truncateAddr(wallet)}</span>
                {copied ? (
                  <Check className="w-3 h-3" style={{ color: "#16a34a" }} />
                ) : (
                  <Copy
                    className="w-3 h-3 opacity-60 group-hover:opacity-100"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                )}
              </button>
            ) : (
              <span
                className="text-[12.5px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Using a local dev fallback wallet.
              </span>
            )}
          </SettingRow>

          <SettingRow label="Cluster">
            <span
              className="inline-flex items-center gap-1.5 text-[12.5px] font-mono"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "#F59E0B" }}
              />
              Solana devnet
            </span>
          </SettingRow>

          <SettingRow label="Kyvern program">
            <a
              href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[12.5px] transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              PpmZEr…MSqc
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </SettingRow>

          <SettingRow label="Squads program">
            <a
              href="https://explorer.solana.com/address/SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[12.5px] transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              SQDS4e…2pCf
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </SettingRow>
        </div>
        {wallet && (
          <div
            className="mt-5 pt-5 flex items-center justify-between"
            style={{ borderTop: "0.5px solid var(--border-subtle)" }}
          >
            <div>
              <p
                className="text-[12.5px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Sign out
              </p>
              <p
                className="text-[11.5px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Ends your Privy session. Your vaults stay on-chain.
              </p>
            </div>
            <button
              onClick={onSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[12.5px] font-semibold transition-colors hover:bg-[var(--surface-2)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                color: "var(--text-primary)",
                border: "0.5px solid var(--border)",
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </motion.div>

      {/* Deeper settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
      >
        <h2
          className="text-[13.5px] font-semibold tracking-tight mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Deeper settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DeeperLink
            href="/pulse/dashboard/billing"
            icon={CreditCard}
            title="Billing"
            desc="Plan, invoices, usage."
          />
          <DeeperLink
            href="/pulse/dashboard/webhooks"
            icon={Webhook}
            title="Webhooks"
            desc="Push payment events to your own backend."
          />
          <DeeperLink
            href="/pulse/dashboard/alerts"
            icon={Bell}
            title="Alerts"
            desc="Slack, email, on-chain triggers."
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="p-4 rounded-[12px] flex items-center gap-2 text-[12px]"
        style={{
          background: "var(--surface-2)",
          border: "0.5px solid var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        <Shield className="w-3 h-3 shrink-0" />
        Kyvern is <span className="font-semibold">pre-alpha</span>, devnet-only.
        Do not deposit mainnet funds. Squads v4 (which we compose with) is
        audited 3× and secures $10B+ on Solana today.
      </motion.div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-3 rounded-[12px]"
      style={{
        background: "var(--surface-2)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-1"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function DeeperLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group p-4 rounded-[12px] block transition-colors hover:bg-[var(--surface-2)]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <Icon className="w-4 h-4 mb-2" />
      <p
        className="text-[13px] font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </p>
      <p
        className="mt-0.5 text-[11.5px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {desc}
      </p>
      <div
        className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        Open
        <ArrowUpRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

function truncateAddr(addr: string, head = 6, tail = 6): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
