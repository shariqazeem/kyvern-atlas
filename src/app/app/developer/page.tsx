"use client";

/**
 * /app/developer — the SDK onboarding surface.
 *
 * Moved here from /app's body on 2026-05-10 (Worker pivot). The /app
 * stage is now the Atlas mission-control card; the integration wizard
 * + per-vault event feed live here for users who want to wire the
 * SDK into their own app.
 *
 * Layout: header + two-column [IntegrationWizard | AgentEventFeed].
 * Same components as before, just on a dedicated route.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Code2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { IntegrationWizard } from "@/components/device/wizard/integration-wizard";
import { AgentEventFeed } from "@/components/device/feed/agent-event-feed";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: { id: string; name: string; emoji: string; pausedAt: string | null; network: string };
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  const K = "kyvern:dev-wallet";
  const e = window.localStorage.getItem(K);
  if (e) return e;
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(K, s);
  return s;
}

export default function DeveloperPage() {
  const { wallet, isLoading } = useAuth();
  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) {
      setLoading(false);
      return;
    }
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) setVault(vaults[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet]);

  const vaultId = vault?.vault.id ?? null;

  return (
    <div
      className="mx-auto w-full px-4 sm:px-6 py-5"
      style={{ maxWidth: 1320, background: "#FAFAFA" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex items-center justify-between gap-3 mb-5 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)]"
          >
            <ArrowLeft
              className="w-3.5 h-3.5"
              style={{ color: "rgba(15,23,42,0.55)" }}
              strokeWidth={2}
            />
            <span
              className="text-[12px]"
              style={{ color: "rgba(15,23,42,0.55)" }}
            >
              Back
            </span>
          </Link>
          <span
            style={{
              width: 1,
              height: 16,
              background: "rgba(15,23,42,0.10)",
            }}
          />
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0A0A0A 0%, #1F2937 100%)",
              }}
            >
              <Code2 className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color: "#86EFAC" }} />
            </div>
            <h1
              className="text-[18px] font-semibold tracking-[-0.015em]"
              style={{ color: "#0A0A0A" }}
            >
              Developer mode
            </h1>
          </div>
        </div>

        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
        >
          mint key · install SDK · run a chain-enforced payment
        </span>
      </motion.div>

      {/* Body */}
      {loading || isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{
              borderColor: "rgba(0,0,0,0.08)",
              borderTopColor: "#0A0A0A",
            }}
          />
        </div>
      ) : !vault ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-[16px] p-8 text-center"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <h2
            className="text-[18px] font-semibold tracking-[-0.01em]"
            style={{ color: "#0A0A0A" }}
          >
            Spin up your vault first.
          </h2>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            The wizard mints an agent key against a real Squads vault.
            Provision one with Clone Atlas, then come back here.
          </p>
          <Link
            href="/vault/new"
            className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-[12px] text-[13px] font-semibold transition-all active:scale-[0.97]"
            style={{ background: "#0A0A0A", color: "#FFFFFF" }}
          >
            Clone Atlas →
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6"
        >
          <IntegrationWizard
            vaultId={vaultId}
            ownerWallet={wallet ?? null}
            className="min-h-[480px]"
          />
          <div className="flex flex-col gap-3">
            <div>
              <div
                className="font-mono uppercase tracking-[0.18em]"
                style={{ color: "rgba(15,23,42,0.45)", fontSize: 10 }}
              >
                Live SDK events
              </div>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "rgba(15,23,42,0.55)" }}
              >
                Every <span className="font-mono">vault.pay()</span> from your
                code lands here in real time. Settled, refused, or blocked —
                with the on-chain signature when applicable.
              </p>
            </div>
            <AgentEventFeed
              vaultId={vaultId}
              ownerWallet={wallet ?? null}
              className="min-h-[440px]"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
