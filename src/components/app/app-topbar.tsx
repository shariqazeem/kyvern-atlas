"use client";

/* ════════════════════════════════════════════════════════════════════
   AppTopbar — unified top navigation for /app/*.

   Replaces both the Pulse DashboardHeader and the Vault TopBar with one
   consistent chrome. Holds:
     · Logo (home link)
     · Contextual breadcrumb / page title
     · Primary action dropdown ("Create" — vault or service)
     · Wallet status chip (copy-to-clipboard on click)
     · Help link
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  Copy,
  Check,
  Plus,
  Wallet,
  Globe,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function truncate(addr: string, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function AppTopbar() {
  const { wallet } = useAuth();
  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
    <header
      className="sticky top-0 z-40 h-14 flex items-center justify-between px-5 md:px-8"
      style={{
        borderBottom: "0.5px solid var(--border-subtle)",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "saturate(180%) blur(18px)",
        WebkitBackdropFilter: "saturate(180%) blur(18px)",
      }}
    >
      {/* Left — logo + crumb */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/app" className="flex items-center gap-2 shrink-0">
          <div
            className="w-6 h-6 rounded-[7px] flex items-center justify-center"
            style={{ background: "var(--text-primary)" }}
          >
            <span className="text-white text-[12px] font-bold tracking-tight">
              K
            </span>
          </div>
          <span
            className="hidden sm:inline text-[14.5px] font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            Kyvern
          </span>
        </Link>

        <div
          className="hidden sm:block h-4 w-px"
          style={{ background: "var(--border)" }}
        />

        <span
          className="hidden sm:inline text-[13px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Agent commerce on Solana
        </span>
      </div>

      {/* Right — create dropdown + wallet + help */}
      <div className="flex items-center gap-1.5">
        {/* CREATE dropdown — one button, two actions (vault or service) */}
        <div className="relative">
          <button
            onClick={() => setCreateOpen((v) => !v)}
            onBlur={() => setTimeout(() => setCreateOpen(false), 150)}
            className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "var(--text-primary)",
              color: "var(--background)",
            }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Create
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {createOpen && (
            <div
              className="absolute right-0 mt-1.5 w-[240px] p-1.5 rounded-[12px] z-50"
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border)",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.10)",
              }}
            >
              <Link
                href="/vault/new"
                className="flex items-start gap-3 px-3 py-2.5 rounded-[8px] transition-colors hover:bg-[var(--surface-2)]"
              >
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "#EEF0FF", color: "#4F46E5" }}
                >
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Create a vault
                  </p>
                  <p
                    className="text-[11.5px] leading-[1.45]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Give your AI agent a spending cap.
                  </p>
                </div>
              </Link>
              <Link
                href="/app/services"
                className="flex items-start gap-3 px-3 py-2.5 rounded-[8px] transition-colors hover:bg-[var(--surface-2)]"
              >
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "#E8F4FE", color: "#0EA5E9" }}
                >
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Wrap an x402 endpoint
                  </p>
                  <p
                    className="text-[11.5px] leading-[1.45]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Capture every inbound agent payment.
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Wallet chip */}
        {wallet && (
          <button
            onClick={copyWallet}
            aria-label="Copy wallet"
            className="group inline-flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-[10px] text-[12px] font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: "var(--surface-3)" }}
            >
              <Wallet className="w-2.5 h-2.5" />
            </span>
            <span className="font-mono">{truncate(wallet, 4, 4)}</span>
            {copied ? (
              <Check className="w-3 h-3 text-[var(--success)]" />
            ) : (
              <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        )}

        {/* Help */}
        <Link
          href="/docs"
          className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-[10px] transition-colors hover:bg-[var(--surface-2)]"
          aria-label="Docs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <HelpCircle className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
