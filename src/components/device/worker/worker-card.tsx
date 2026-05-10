"use client";

/**
 * WorkerCard — Atlas mission control hero. The /app stage.
 *
 * One worker, one card, one unbroken on-chain story. Atlas has been
 * running autonomously since 2026-04-20 — this card surfaces that as
 * a living thing instead of a list of metrics.
 *
 * Sections, top to bottom:
 *   1. Identity row — avatar · name · role pill · live indicator
 *   2. Current Objective — dark terminal panel · pulled from
 *      lastDecision.reasoning, swaps on each cycle (real agency, not
 *      faked)
 *   3. Economic Lifecycle ribbon — Earned → Treasury → Spent → Output
 *   4. Stats grid — Uptime · Cycles · Attacks Blocked · Funds Lost
 *   5. Autonomous Actions feed — last 5 decisions with reasoning +
 *      outcome chip + Explorer link
 *   6. Attacks Blocked feed — last 3 attacks
 *   7. Footer — link to /atlas for the full timeline
 *
 * Data: polls /api/atlas/status (3s), /api/atlas/decisions (10s),
 * /api/atlas/leaderboard (15s). All public, no auth.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ExternalLink,
  Shield,
  Sparkles,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const POLICY_PROGRAM = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

interface AtlasStatus {
  running: boolean;
  totalCycles: number;
  firstIgnitionAt: string;
  uptimeMs: number;
  totalSettled: number;
  totalSpentUsd: number;
  totalEarnedUsd: number;
  totalBlocked: number;
  totalAttacksBlocked: number;
  fundsLostUsd: number;
  lastDecision: Decision | null;
  lastAttack: Attack | null;
  nextCycleAt: string | null;
  nextAttackAt: string | null;
  policy: {
    dailyCapUsd: number;
    spentTodayUsd: number;
    spendUtilization: number;
    nearCap: boolean;
    exhausted: boolean;
    windowResetsAt: string | null;
  };
  vaultId: string;
  network: "devnet" | "mainnet";
}

interface Decision {
  id: string;
  decidedAt: string;
  reasoning: string;
  action: string;
  merchant: string | null;
  amountUsd: number;
  outcome: "settled" | "failed" | "blocked" | "idle" | string;
  txSignature: string | null;
  blockedReason: string | null;
  latencyMs: number;
  cycle: number;
}

interface Attack {
  id: string;
  attemptedAt: string;
  type: string;
  description: string;
  blockedReason: string;
  failedTxSignature: string | null;
  source: string;
}

interface Leaderboard {
  recent: Attack[];
  weekly: { total: number; byType: Record<string, number> };
  allTime: { total: number; byType: Record<string, number> };
}

export function WorkerCard({ className }: { className?: string }) {
  const [status, setStatus] = useState<AtlasStatus | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());

  // Tick local clock every 1s — drives "last action 17s ago" + countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll status every 3s
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/status", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as AtlasStatus;
        if (alive) setStatus(d);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Poll decisions every 10s
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/decisions?limit=6", {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = (await r.json()) as { decisions: Decision[] };
        if (alive) setDecisions(d.decisions ?? []);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 10_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Poll leaderboard every 15s for the attack list
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/leaderboard", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as Leaderboard;
        if (alive) setAttacks((d.recent ?? []).slice(0, 4));
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  if (!status) return <SkeletonCard className={className} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`relative w-full ${className ?? ""}`}
      style={{
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -28px rgba(15,23,42,0.18)",
        overflow: "hidden",
      }}
    >
      {/* Subtle ambient glow at the top */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative p-5 sm:p-6 flex flex-col gap-5">
        <Identity status={status} now={now} />
        <CurrentObjective status={status} now={now} />
        <EconomicLifecycle status={status} />
        <StatsGrid status={status} now={now} />
        <AutonomousActions decisions={decisions} status={status} />
        <AttacksBlocked attacks={attacks} status={status} />
        <Footer status={status} />
      </div>
    </motion.div>
  );
}

/* ─── Identity row ───────────────────────────────────────────────── */

function Identity({ status, now }: { status: AtlasStatus; now: number }) {
  const lastTs = status.lastDecision?.decidedAt
    ? new Date(status.lastDecision.decidedAt).getTime()
    : null;
  const lastRel = lastTs ? relTime(now - lastTs) : null;

  return (
    <div className="flex items-start gap-4">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2
            className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.015em]"
            style={{ color: "#0A0A0A" }}
          >
            Atlas
          </h2>
          <span
            className="font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-md"
            style={{
              fontSize: 9,
              color: "#15803D",
              background: "rgba(34,197,94,0.10)",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            Worker · 001
          </span>
        </div>
        <p
          className="mt-0.5 text-[12.5px]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          Reference autonomous worker · Solana {status.network}
        </p>

        {/* Live row */}
        <div className="mt-2 flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <motion.span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: status.running ? "#22C55E" : "#9CA3AF",
                boxShadow: status.running
                  ? "0 0 0 3px rgba(34,197,94,0.18), 0 0 8px #22C55E"
                  : "none",
              }}
              animate={
                status.running
                  ? { opacity: [0.55, 1, 0.55] }
                  : { opacity: 0.55 }
              }
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9.5, color: status.running ? "#15803D" : "#9CA3AF" }}
            >
              {status.running ? "Live" : "Offline"}
            </span>
          </span>
          {lastRel && (
            <>
              <Sep />
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "rgba(15,23,42,0.65)" }}
              >
                last action {lastRel}
              </span>
            </>
          )}
          <Sep />
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "rgba(15,23,42,0.65)" }}
          >
            cycle{" "}
            <span style={{ color: "#0A0A0A", fontWeight: 600 }}>
              {status.totalCycles.toLocaleString()}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: 56, height: 56 }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-[14px]"
        style={{
          boxShadow: "0 0 0 2px rgba(34,197,94,0.45)",
        }}
        animate={{
          boxShadow: [
            "0 0 0 2px rgba(34,197,94,0.30)",
            "0 0 0 2px rgba(34,197,94,0.55), 0 0 12px rgba(34,197,94,0.35)",
            "0 0 0 2px rgba(34,197,94,0.30)",
          ],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 rounded-[14px] flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0A0A0A 0%, #1F2937 100%)",
        }}
      >
        <span
          className="font-serif"
          style={{
            fontSize: 26,
            color: "#F9FAFB",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          A
        </span>
      </div>
      {/* Inner highlight */}
      <div
        aria-hidden
        className="absolute inset-px rounded-[13px] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
        }}
      />
    </div>
  );
}

/* ─── Current Objective (dark terminal panel) ────────────────────── */

function CurrentObjective({
  status,
  now,
}: {
  status: AtlasStatus;
  now: number;
}) {
  const reasoning = status.lastDecision?.reasoning ?? "Standing by.";
  const action = status.lastDecision?.action ?? "idle";
  const nextCycleMs = status.nextCycleAt
    ? new Date(status.nextCycleAt).getTime() - now
    : null;
  const nextRel =
    nextCycleMs !== null
      ? nextCycleMs > 0
        ? `next cycle in ${countdown(nextCycleMs)}`
        : "next cycle imminent"
      : null;

  // Rotating "thinking..." flavor while waiting for next cycle
  const thinkingPhrases = useMemo(
    () => [
      "monitoring forecast feeds",
      "evaluating spend budget",
      "scoring market signals",
      "checking allowlist policy",
      "watching for incoming revenue",
      "drafting next on-chain action",
    ],
    [],
  );
  const [thinkIdx, setThinkIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setThinkIdx((i) => (i + 1) % thinkingPhrases.length),
      3500,
    );
    return () => clearInterval(t);
  }, [thinkingPhrases.length]);

  return (
    <div
      className="relative rounded-[14px] overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0A0E1A 0%, #0F1426 100%)",
        border: "1px solid rgba(34,197,94,0.18)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px -8px rgba(34,197,94,0.20)",
      }}
    >
      <div className="px-4 py-3.5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="font-mono uppercase tracking-[0.18em]"
            style={{ fontSize: 9, color: "rgba(134,239,172,0.75)" }}
          >
            Current Objective
          </span>
          <span
            className="font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
            style={{
              fontSize: 8.5,
              color: "rgba(134,239,172,0.85)",
              background: "rgba(34,197,94,0.10)",
              border: "1px solid rgba(34,197,94,0.18)",
            }}
          >
            {action}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={status.lastDecision?.id ?? "idle"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex items-start gap-2"
          >
            <span
              className="font-mono mt-0.5"
              style={{ fontSize: 13, color: "#86EFAC" }}
            >
              &gt;
            </span>
            <span
              className="font-mono leading-[1.55]"
              style={{
                fontSize: 13.5,
                color: "#E5E7EB",
                letterSpacing: "-0.005em",
              }}
            >
              {reasoning}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <span className="flex items-center gap-1.5">
            <motion.span
              className="rounded-full"
              style={{ width: 5, height: 5, background: "#86EFAC" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={thinkIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="font-mono"
                style={{ fontSize: 10.5, color: "rgba(134,239,172,0.75)" }}
              >
                {thinkingPhrases[thinkIdx]}…
              </motion.span>
            </AnimatePresence>
          </span>
          {nextRel && (
            <>
              <span
                style={{
                  width: 1,
                  height: 9,
                  background: "rgba(134,239,172,0.18)",
                }}
              />
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: 10.5, color: "rgba(229,231,235,0.55)" }}
              >
                {nextRel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scanline accent */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(134,239,172,0.45), transparent)",
        }}
      />
    </div>
  );
}

/* ─── Economic Lifecycle ribbon ──────────────────────────────────── */

function EconomicLifecycle({ status }: { status: AtlasStatus }) {
  // Treasury balance: earned − spent. Atlas's vault USDC isn't in
  // /api/atlas/status, so we approximate: what the worker has produced
  // in net economic value. Honest framing.
  const treasury = Math.max(
    0,
    status.totalEarnedUsd - status.totalSpentUsd,
  );
  const items = [
    {
      label: "Earned",
      value: `$${formatUsd(status.totalEarnedUsd)}`,
      tone: "green" as const,
    },
    {
      label: "Treasury",
      value: `$${formatUsd(treasury > 0 ? treasury : status.totalEarnedUsd - status.totalSpentUsd)}`,
      tone: "neutral" as const,
      // Show negative net honestly — Atlas spends to earn
      raw: status.totalEarnedUsd - status.totalSpentUsd,
    },
    {
      label: "Spent",
      value: `$${formatUsd(status.totalSpentUsd)}`,
      tone: "neutral" as const,
    },
    {
      label: "Output",
      value: status.totalSettled.toLocaleString(),
      tone: "neutral" as const,
      sub: "txs",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Activity
          className="w-3 h-3"
          style={{ color: "rgba(15,23,42,0.45)" }}
          strokeWidth={2}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Economic Lifecycle
        </span>
      </div>

      <div
        className="grid grid-cols-7 items-center gap-1 rounded-[12px] p-3"
        style={{
          background:
            "linear-gradient(180deg, rgba(34,197,94,0.04) 0%, rgba(15,23,42,0.02) 100%)",
          border: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        <RibbonCell {...items[0]} />
        <Arrow />
        <RibbonCell {...items[1]} />
        <Arrow />
        <RibbonCell {...items[2]} />
        <Arrow />
        <RibbonCell {...items[3]} />
      </div>
    </div>
  );
}

function RibbonCell({
  label,
  value,
  tone,
  sub,
  raw,
}: {
  label: string;
  value: string;
  tone: "green" | "neutral";
  sub?: string;
  raw?: number;
}) {
  const negative = raw !== undefined && raw < 0;
  const valueColor = tone === "green" ? "#15803D" : negative ? "#B45309" : "#0A0A0A";
  return (
    <div className="flex flex-col items-center text-center col-span-1 min-w-0">
      <span
        className="font-mono tabular-nums font-semibold whitespace-nowrap"
        style={{ fontSize: 14, color: valueColor, letterSpacing: "-0.01em" }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em] mt-0.5"
        style={{ fontSize: 8.5, color: "rgba(15,23,42,0.50)" }}
      >
        {sub ? `${label} · ${sub}` : label}
      </span>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center col-span-1">
      <ArrowRight
        className="w-3 h-3"
        style={{ color: "rgba(15,23,42,0.30)" }}
        strokeWidth={2}
      />
    </div>
  );
}

/* ─── Stats grid ─────────────────────────────────────────────────── */

function StatsGrid({ status, now }: { status: AtlasStatus; now: number }) {
  const ignitionMs = new Date(status.firstIgnitionAt).getTime();
  const uptime = formatUptime(now - ignitionMs);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <StatTile label="Uptime" value={uptime} />
      <StatTile label="Cycles" value={status.totalCycles.toLocaleString()} />
      <StatTile
        label="Attacks Blocked"
        value={status.totalAttacksBlocked.toLocaleString()}
        tone="amber"
        icon={<Shield className="w-3 h-3" strokeWidth={2.2} />}
      />
      <StatTile
        label="Funds Lost"
        value={`$${status.fundsLostUsd.toFixed(2)}`}
        tone="green-strong"
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "amber" | "green-strong";
  icon?: React.ReactNode;
}) {
  const valueColor =
    tone === "amber" ? "#B45309" : tone === "green-strong" ? "#15803D" : "#0A0A0A";
  return (
    <div
      className="rounded-[12px] p-3 flex flex-col gap-1"
      style={{
        background: "rgba(15,23,42,0.025)",
        border: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      <div className="flex items-center gap-1">
        {icon && <span style={{ color: "rgba(15,23,42,0.45)" }}>{icon}</span>}
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 8.5, color: "rgba(15,23,42,0.55)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="font-mono tabular-nums font-semibold"
        style={{ fontSize: 16, color: valueColor, letterSpacing: "-0.01em" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Autonomous Actions feed ────────────────────────────────────── */

function AutonomousActions({
  decisions,
  status,
}: {
  decisions: Decision[];
  status: AtlasStatus;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Sparkles
          className="w-3 h-3"
          style={{ color: "rgba(15,23,42,0.45)" }}
          strokeWidth={2}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Autonomous Actions
        </span>
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ border: "1px solid rgba(15,23,42,0.05)" }}
      >
        {decisions.slice(0, 5).map((d, i) => (
          <DecisionRow
            key={d.id}
            d={d}
            isLast={i === Math.min(decisions.length, 5) - 1}
            network={status.network}
          />
        ))}
        {decisions.length === 0 && (
          <div
            className="px-3 py-4 text-center"
            style={{ fontSize: 11.5, color: "rgba(15,23,42,0.45)" }}
          >
            Waiting on first decision…
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionRow({
  d,
  isLast,
  network,
}: {
  d: Decision;
  isLast: boolean;
  network: "devnet" | "mainnet";
}) {
  const ts = formatHHMM(d.decidedAt);
  const explorerUrl = d.txSignature
    ? `https://explorer.solana.com/tx/${d.txSignature}?cluster=${network}`
    : null;
  return (
    <div
      className="px-3 py-2.5 flex items-center gap-3"
      style={{
        background: "#FFFFFF",
        borderBottom: isLast ? undefined : "1px solid rgba(15,23,42,0.04)",
      }}
    >
      <span
        className="font-mono tabular-nums flex-shrink-0"
        style={{ fontSize: 10.5, color: "rgba(15,23,42,0.45)", width: 38 }}
      >
        {ts}
      </span>
      <span
        className="font-mono uppercase tracking-[0.10em] flex-shrink-0 text-center"
        style={{
          fontSize: 9,
          color: "rgba(15,23,42,0.65)",
          width: 64,
        }}
      >
        {d.action.replace("_", " ")}
      </span>
      <span
        className="text-[12px] truncate flex-1 min-w-0"
        style={{ color: "rgba(15,23,42,0.75)" }}
        title={d.reasoning}
      >
        {d.reasoning}
      </span>
      <OutcomeChip outcome={d.outcome} amountUsd={d.amountUsd} />
      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0"
          aria-label="View on Explorer"
        >
          <ExternalLink
            className="w-3 h-3"
            style={{ color: "rgba(15,23,42,0.40)" }}
            strokeWidth={2}
          />
        </a>
      ) : (
        <span style={{ width: 12 }} />
      )}
    </div>
  );
}

function OutcomeChip({ outcome, amountUsd }: { outcome: string; amountUsd: number }) {
  let bg = "rgba(15,23,42,0.04)";
  let color = "rgba(15,23,42,0.55)";
  let label: string = outcome;
  if (outcome === "settled") {
    bg = "rgba(34,197,94,0.10)";
    color = "#15803D";
    label = `+$${amountUsd.toFixed(amountUsd < 0.1 ? 3 : 2)}`;
  } else if (outcome === "failed" || outcome === "blocked") {
    bg = "rgba(245,158,11,0.10)";
    color = "#B45309";
    label = outcome;
  } else if (outcome === "idle") {
    bg = "rgba(15,23,42,0.04)";
    color = "rgba(15,23,42,0.50)";
    label = "idle";
  }
  return (
    <span
      className="font-mono uppercase tracking-[0.10em] px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ fontSize: 9, color, background: bg }}
    >
      {label}
    </span>
  );
}

/* ─── Attacks blocked feed ───────────────────────────────────────── */

function AttacksBlocked({
  attacks,
  status,
}: {
  attacks: Attack[];
  status: AtlasStatus;
}) {
  if (attacks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Shield
          className="w-3 h-3"
          style={{ color: "#B45309" }}
          strokeWidth={2.2}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Attacks Blocked
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 10, color: "#B45309" }}
        >
          · {status.totalAttacksBlocked.toLocaleString()} all-time
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {attacks.slice(0, 3).map((a) => (
          <div
            key={a.id}
            className="rounded-[10px] px-3 py-2 flex items-start gap-2.5"
            style={{
              background: "rgba(245,158,11,0.04)",
              border: "1px solid rgba(245,158,11,0.12)",
            }}
          >
            <span
              className="rounded-full mt-1 flex-shrink-0"
              style={{
                width: 5,
                height: 5,
                background: "#F59E0B",
                boxShadow: "0 0 0 3px rgba(245,158,11,0.18)",
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-mono uppercase tracking-[0.10em]"
                  style={{ fontSize: 9, color: "#B45309" }}
                >
                  {a.type.replace("_", " ")}
                </span>
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 9.5, color: "rgba(15,23,42,0.40)" }}
                >
                  {formatHHMM(a.attemptedAt)}
                </span>
              </div>
              <p
                className="mt-0.5 text-[12px] leading-[1.45]"
                style={{ color: "rgba(15,23,42,0.75)" }}
              >
                {a.description}
              </p>
              <p
                className="mt-0.5 font-mono"
                style={{
                  fontSize: 10.5,
                  color: "rgba(15,23,42,0.50)",
                }}
              >
                refused: {a.blockedReason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */

function Footer({ status }: { status: AtlasStatus }) {
  return (
    <div
      className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t"
      style={{ borderColor: "rgba(15,23,42,0.05)", paddingTop: 12 }}
    >
      <span
        className="text-[10.5px]"
        style={{ color: "rgba(15,23,42,0.45)" }}
      >
        Authorization enforced by{" "}
        <a
          href={`https://explorer.solana.com/address/${POLICY_PROGRAM}?cluster=${status.network}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono hover:underline"
          style={{ color: "rgba(15,23,42,0.65)" }}
        >
          PpmZ…MSqc
        </a>
      </span>
      <a
        href="/atlas"
        className="group inline-flex items-center gap-1 text-[11.5px] font-medium hover:underline"
        style={{ color: "#0A0A0A" }}
      >
        View full timeline ({status.totalCycles.toLocaleString()})
        <ArrowRight
          className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </a>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────── */

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`relative w-full ${className ?? ""}`}
      style={{
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.06)",
        minHeight: 420,
      }}
    >
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-[14px]"
            style={{ background: "rgba(15,23,42,0.05)" }}
          />
          <div className="flex flex-col gap-2 flex-1">
            <div
              className="h-5 rounded w-32"
              style={{ background: "rgba(15,23,42,0.05)" }}
            />
            <div
              className="h-3 rounded w-48"
              style={{ background: "rgba(15,23,42,0.04)" }}
            />
          </div>
        </div>
        <div
          className="h-20 rounded-[14px]"
          style={{ background: "rgba(15,23,42,0.04)" }}
        />
        <div
          className="h-14 rounded-[12px]"
          style={{ background: "rgba(15,23,42,0.03)" }}
        />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-[12px]"
              style={{ background: "rgba(15,23,42,0.03)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function Sep() {
  return (
    <span style={{ width: 1, height: 10, background: "rgba(15,23,42,0.10)" }} />
  );
}

function relTime(diffMs: number): string {
  if (diffMs < 5_000) return "just now";
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  return `${Math.floor(diffMs / 3_600_000)}h ago`;
}

function countdown(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

function formatUptime(ms: number): string {
  if (ms <= 0) return "0d";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  return `${days}d ${hours}h`;
}

function formatUsd(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(2);
  return v.toFixed(2);
}

function formatHHMM(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}
