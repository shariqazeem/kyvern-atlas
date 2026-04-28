"use client";

/**
 * LiveWorkerCard — persistent right-side card on the agent detail page
 * (desktop). Shows the worker as a working module: who it is, what it's
 * watching right now, when it last checked, what state it's in, and
 * the on-chain budget the policy program is enforcing.
 *
 * On mobile this collapses to a horizontal pill that expands on tap.
 *
 * Polls /api/agents/[id]/live-card every 3s during boot, every 8s once
 * the worker is live (mirrors the rhythm of the surrounding page).
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type StateKind = "waking" | "reading" | "scanning" | "drafting" | "delivered" | "idle";

interface LiveCard {
  name: string;
  emoji: string;
  template: string;
  templateLabel: string;
  watchingTarget: string | null;
  watchingHref: string | null;
  lastCheckedAt: number | null;
  state: { label: string; kind: StateKind };
  budget: { perTxMaxUsd: number | null; dailyLimitUsd: number | null };
  policyProgramId: string;
  phase: "boot" | "live";
}

interface LiveWorkerCardProps {
  agentId: string;
  /** Mobile vs desktop affects whether we render as a card or a pill. */
  variant: "card" | "pill";
}

function fmtAgo(ms: number): string {
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)} seconds ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} minutes ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hours ago`;
  return `${Math.floor(ms / 86_400_000)} days ago`;
}

function shortenWatching(s: string): string {
  if (s.length <= 40) return s;
  // For URLs, keep host + truncated path
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const path = u.pathname + (u.search ?? "");
      const compressed = path.length > 18 ? path.slice(0, 15) + "…" : path;
      return `${u.host.replace(/^www\./, "")}${compressed}`;
    } catch {
      /* fall through */
    }
  }
  // For long base58 wallet strings, keep first 6 + last 4
  if (/^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(s)) {
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  }
  return s.slice(0, 40) + "…";
}

function shortenAddr(s: string): string {
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function StatePill({ state }: { state: LiveCard["state"] }) {
  const tone =
    state.kind === "delivered"
      ? "#15803D"
      : state.kind === "idle"
        ? "#6B7280"
        : "#B45309";
  const dotBg =
    state.kind === "delivered"
      ? "#22C55E"
      : state.kind === "idle"
        ? "#9CA3AF"
        : "#F59E0B";
  const ringBg =
    state.kind === "delivered"
      ? "rgba(34,197,94,0.12)"
      : state.kind === "idle"
        ? "rgba(156,163,175,0.10)"
        : "rgba(245,158,11,0.12)";

  return (
    <span className="inline-flex items-center gap-1.5">
      <motion.span
        className="rounded-full"
        style={{
          width: 7,
          height: 7,
          background: dotBg,
          boxShadow: `0 0 0 3px ${ringBg}`,
        }}
        animate={
          state.kind === "idle" || state.kind === "delivered"
            ? {}
            : { opacity: [0.55, 1, 0.55] }
        }
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        className="font-mono"
        style={{
          color: tone,
          fontSize: 12.5,
          letterSpacing: "0.005em",
          fontWeight: 500,
        }}
      >
        {state.label}
      </span>
    </span>
  );
}

export function LiveWorkerCard({ agentId, variant }: LiveWorkerCardProps) {
  const [data, setData] = useState<LiveCard | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(variant === "card");

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/agents/${agentId}/live-card`);
      if (!r.ok) return;
      const json = (await r.json()) as LiveCard;
      setData(json);
    } catch {
      /* ignore */
    }
  }, [agentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const intervalMs = data?.phase === "boot" ? 3000 : 8000;
    const iv = setInterval(fetchData, intervalMs);
    return () => clearInterval(iv);
  }, [fetchData, data?.phase]);

  // For the live "checked Xs ago" line.
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!data) return null;

  const explorerUrl = `https://explorer.solana.com/address/${data.policyProgramId}?cluster=devnet`;

  // ── Mobile pill (collapsed) ────────────────────────────────────────
  if (variant === "pill" && !expanded) {
    return (
      <motion.button
        onClick={() => setExpanded(true)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="w-full rounded-[12px] mb-4 px-4 py-3 flex items-center gap-3 text-left"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
        }}
      >
        <span className="text-[20px]">{data.emoji}</span>
        <span
          className="font-mono text-[12.5px] flex-1 min-w-0 truncate"
          style={{ color: "#0A0A0A" }}
        >
          {data.name}
        </span>
        <StatePill state={data.state} />
        {data.lastCheckedAt && (
          <span
            className="font-mono shrink-0"
            style={{ color: "#9CA3AF", fontSize: 10.5 }}
          >
            {fmtAgo(now - data.lastCheckedAt)}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
      className="rounded-[16px] overflow-hidden mb-4"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,1)",
          "0 1px 2px rgba(15,23,42,0.04)",
          "0 8px 24px -8px rgba(15,23,42,0.06)",
        ].join(", "),
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-2.5"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <span className="text-[18px]">{data.emoji}</span>
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "#0A0A0A", fontSize: 10.5, fontWeight: 600 }}
        >
          {data.name}
        </span>
        <span style={{ color: "#D1D5DB" }}>·</span>
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          {data.templateLabel}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 space-y-3.5">
        {/* WATCHING */}
        <div>
          <div
            className="font-mono uppercase mb-1"
            style={{ color: "#9CA3AF", fontSize: 9.5, letterSpacing: "0.14em" }}
          >
            Watching
          </div>
          {data.watchingTarget ? (
            data.watchingHref ? (
              <a
                href={data.watchingHref}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] inline-flex items-center gap-1 hover:underline"
                style={{ color: "#0A0A0A" }}
              >
                {shortenWatching(data.watchingTarget)}
                <ExternalLink className="w-3 h-3" style={{ color: "#9CA3AF" }} strokeWidth={2} />
              </a>
            ) : (
              <span className="font-mono text-[12px]" style={{ color: "#0A0A0A" }}>
                {shortenWatching(data.watchingTarget)}
              </span>
            )
          ) : (
            <span className="font-mono text-[12px]" style={{ color: "#9CA3AF" }}>
              —
            </span>
          )}
        </div>

        {/* CHECKED */}
        <div>
          <div
            className="font-mono uppercase mb-1"
            style={{ color: "#9CA3AF", fontSize: 9.5, letterSpacing: "0.14em" }}
          >
            Checked
          </div>
          <span className="font-mono text-[12px]" style={{ color: "#0A0A0A" }}>
            {data.lastCheckedAt ? fmtAgo(now - data.lastCheckedAt) : "scanning…"}
          </span>
        </div>

        {/* STATE */}
        <div>
          <div
            className="font-mono uppercase mb-1"
            style={{ color: "#9CA3AF", fontSize: 9.5, letterSpacing: "0.14em" }}
          >
            State
          </div>
          <StatePill state={data.state} />
        </div>
      </div>

      {/* Budget footer — the part that proves on-chain enforcement. */}
      <div
        className="px-4 py-3"
        style={{
          borderTop: "1px solid rgba(15,23,42,0.05)",
          background: "rgba(15,23,42,0.02)",
        }}
      >
        <div
          className="font-mono uppercase mb-1"
          style={{ color: "#9CA3AF", fontSize: 9.5, letterSpacing: "0.14em" }}
        >
          Your budget for me
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className="font-mono"
            style={{
              color: "#0A0A0A",
              fontSize: 13,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
            }}
          >
            {data.budget.perTxMaxUsd != null && data.budget.dailyLimitUsd != null
              ? `$${data.budget.perTxMaxUsd.toFixed(2)} / tx · $${data.budget.dailyLimitUsd.toFixed(2)} / day`
              : "—"}
          </span>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 hover:underline"
          style={{ color: "#6B7280", fontSize: 10.5 }}
        >
          <span className="font-mono">enforced by {shortenAddr(data.policyProgramId)}</span>
          <ExternalLink className="w-2.5 h-2.5" style={{ color: "#9CA3AF" }} strokeWidth={2} />
        </a>
      </div>

      {/* Mobile collapse handle */}
      {variant === "pill" && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full py-2 font-mono uppercase"
          style={{
            background: "rgba(15,23,42,0.02)",
            color: "#9CA3AF",
            fontSize: 9,
            letterSpacing: "0.16em",
            borderTop: "1px solid rgba(15,23,42,0.04)",
          }}
        >
          Tap to collapse
        </button>
      )}
    </motion.div>
  );
}
