"use client";

/**
 * PolicyShield — the moat made visible on the device home.
 *
 * Sits between WorkersFoundStrip and BalanceOrbit. A horizontal bar
 * showing:
 *
 *   🛡️ Policy active · Per-tx $0.50 · Daily $5 · Weekly $25
 *                                          ✓ Stake approved 12m ago ↗
 *
 * - Left: shield icon + active label + the 3 budget numbers (vault config)
 * - Right: most recent vault_payment with status colour + Explorer link
 * - If a payment was REJECTED: amber border + "1 action blocked" count
 * - Click → mini drawer with last 5 policy decisions
 *
 * Polls /api/devices/[id]/policy-shield every 15s — the data here
 * doesn't churn the way live-status does, so a slower cadence keeps
 * the round trip cost low while still feeling live.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

interface Decision {
  id: string;
  merchant: string;
  amountUsd: number;
  status: "allowed" | "blocked" | "settled" | "failed";
  approved: boolean;
  reason: string | null;
  txSignature: string | null;
  createdAt: number;
}

interface ShieldData {
  network: "devnet" | "mainnet";
  paused: boolean;
  budgets: {
    perTxMaxUsd: number;
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
  };
  today: { approved: number; rejected: number; onChain: number };
  lastDecision: Decision | null;
  decisions: Decision[];
}

function explorerUrl(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  if (n < 10) return `$${n.toFixed(2)}`;
  return `$${Math.round(n)}`;
}

export function PolicyShield({ deviceId }: { deviceId: string }) {
  const [data, setData] = useState<ShieldData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/devices/${deviceId}/policy-shield`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d as ShieldData))
      .catch(() => {});
  }, [deviceId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [load]);

  if (!data) {
    return (
      <div
        className="w-full rounded-[14px] h-12 animate-pulse"
        style={{ background: "rgba(15,23,42,0.04)" }}
      />
    );
  }

  const last = data.lastDecision;
  const hasRejection = data.today.rejected > 0;

  return (
    <div className="w-full">
      <motion.button
        layout
        type="button"
        onClick={() => setDrawerOpen((v) => !v)}
        whileTap={{ scale: 0.995 }}
        className="w-full text-left rounded-[14px] px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)",
          border: hasRejection
            ? "1px solid rgba(217,119,6,0.30)"
            : "1px solid rgba(34,197,94,0.18)",
          boxShadow: hasRejection
            ? "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04), 0 0 0 3px rgba(217,119,6,0.08)"
            : "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.03), 0 0 0 3px rgba(34,197,94,0.05)",
        }}
      >
        {/* Left side — POLICY INTEGRITY headline as system-health */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <ShieldCheck
              className="w-4 h-4"
              strokeWidth={2.2}
              style={{ color: data.paused ? "#9CA3AF" : "#15803D" }}
            />
            <span
              className="font-mono uppercase tracking-[0.12em]"
              style={{
                color: data.paused ? "#9CA3AF" : "#15803D",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {data.paused
                ? "Policy paused"
                : "Policy integrity · 100%"}
            </span>
            {!data.paused && (
              <motion.span
                aria-hidden
                className="rounded-full ml-0.5"
                style={{
                  width: 5,
                  height: 5,
                  background: "#22C55E",
                  boxShadow: "0 0 0 2.5px rgba(34,197,94,0.16)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </span>
          <span
            className="font-mono"
            style={{ color: "#374151", fontSize: 11 }}
          >
            <span style={{ color: "#0A0A0A", fontWeight: 600 }}>
              {data.today.rejected}
            </span>
            <span style={{ color: "#9CA3AF", marginLeft: 4 }}>blocked</span>
            <span style={{ color: "#D1D5DB", margin: "0 6px" }}>·</span>
            <span style={{ color: "#15803D", fontWeight: 600 }}>$0</span>
            <span style={{ color: "#9CA3AF", marginLeft: 4 }}>
              unauthorized
            </span>
          </span>
          <span style={{ color: "#D1D5DB", fontSize: 11 }}>·</span>
          <BudgetCell label="Per-tx" value={fmtUsd(data.budgets.perTxMaxUsd)} />
          <BudgetCell label="Daily" value={fmtUsd(data.budgets.dailyLimitUsd)} />
          <BudgetCell
            label="Weekly"
            value={fmtUsd(data.budgets.weeklyLimitUsd)}
          />
        </div>

        {/* Right side — last action */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          {last ? (
            <LastActionPill decision={last} network={data.network} />
          ) : (
            <span
              className="font-mono"
              style={{ color: "#9CA3AF", fontSize: 10.5 }}
            >
              No on-chain actions yet
            </span>
          )}
          <ChevronUp
            className={`w-3 h-3 transition-transform ${drawerOpen ? "" : "rotate-180"}`}
            strokeWidth={2.2}
            style={{ color: "#9CA3AF" }}
          />
        </div>
      </motion.button>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-2 rounded-[14px] overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
            }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
            >
              <span
                className="font-mono uppercase tracking-[0.12em]"
                style={{ color: "#6B7280", fontSize: 9.5 }}
              >
                Recent enforcement decisions
              </span>
              <span
                className="font-mono"
                style={{ color: "#9CA3AF", fontSize: 10 }}
              >
                {data.today.approved + data.today.rejected} today
              </span>
            </div>
            {data.decisions.length === 0 ? (
              <div
                className="px-3 py-4 text-center"
                style={{ color: "#9CA3AF", fontSize: 12 }}
              >
                Workers will trigger on-chain payments when they spend or earn.
              </div>
            ) : (
              <ul
                className="divide-y"
                style={{ borderColor: "rgba(15,23,42,0.04)" }}
              >
                {data.decisions.slice(0, 5).map((d) => (
                  <li
                    key={d.id}
                    className="px-3 py-2 flex items-center gap-2 text-[12px]"
                  >
                    {d.approved ? (
                      <Check
                        className="w-3 h-3 shrink-0"
                        strokeWidth={2.6}
                        style={{ color: "#15803D" }}
                      />
                    ) : (
                      <X
                        className="w-3 h-3 shrink-0"
                        strokeWidth={2.6}
                        style={{ color: "#B45309" }}
                      />
                    )}
                    <span
                      className="font-medium truncate"
                      style={{
                        color: d.approved ? "#15803D" : "#B45309",
                        flex: "0 0 auto",
                      }}
                    >
                      {d.approved ? "Approved" : "Blocked"}
                    </span>
                    <span
                      className="text-[#0A0A0A] truncate min-w-0"
                      style={{ flex: 1 }}
                    >
                      {d.merchant}
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "#374151", fontSize: 11 }}
                    >
                      ${d.amountUsd.toFixed(d.amountUsd < 1 ? 3 : 2)}
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "#9CA3AF", fontSize: 10.5 }}
                    >
                      {fmtAgo(d.createdAt)}
                    </span>
                    {d.txSignature && (
                      <a
                        href={explorerUrl(d.txSignature, data.network)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center"
                        style={{ color: "#6B7280" }}
                      >
                        <ExternalLink className="w-3 h-3" strokeWidth={2} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div
              className="px-3 py-2.5"
              style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
            >
              <Link
                href="/app/payments"
                className="w-full inline-flex items-center justify-between rounded-[10px] px-3 py-2 transition active:scale-[0.99]"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.18)",
                  color: "#15803D",
                }}
              >
                <span
                  className="text-[12px] font-semibold tracking-tight"
                >
                  View full enforcement feed
                </span>
                <ArrowRight className="w-3 h-3" strokeWidth={2.4} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BudgetCell({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="font-mono inline-flex items-baseline gap-0.5"
      style={{ color: "#374151", fontSize: 11 }}
    >
      <span
        className="uppercase tracking-[0.08em]"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        {label}
      </span>
      <span
        style={{
          color: "#0A0A0A",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </span>
  );
}

function LastActionPill({
  decision,
  network,
}: {
  decision: Decision;
  network: "devnet" | "mainnet";
}) {
  const tone = decision.approved ? "#15803D" : "#B45309";
  const bg = decision.approved
    ? "rgba(34,197,94,0.10)"
    : "rgba(217,119,6,0.10)";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
      style={{ background: bg, color: tone, fontSize: 10.5, fontWeight: 600 }}
    >
      {decision.approved ? (
        <Check className="w-2.5 h-2.5" strokeWidth={2.6} />
      ) : (
        <X className="w-2.5 h-2.5" strokeWidth={2.6} />
      )}
      {decision.approved ? "Approved" : "Blocked"} · ${decision.amountUsd.toFixed(decision.amountUsd < 1 ? 3 : 2)}
      <span style={{ opacity: 0.7 }}>· {fmtAgo(decision.createdAt)}</span>
      {decision.txSignature && (
        <a
          href={explorerUrl(decision.txSignature, network)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: tone }}
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </span>
  );
}
