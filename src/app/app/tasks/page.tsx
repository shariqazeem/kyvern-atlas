"use client";

/**
 * /app/tasks — Jobs feed (Phase 6 redesign).
 *
 * The primary surface for the device's economic loop. Three tabs:
 *
 *   Open         — escrowed bounties waiting for a claimer
 *   In progress  — claimed but not yet completed (escrow held)
 *   Completed    — settled tasks with payment_signature → Explorer
 *
 * Polls /api/tasks?status={open,in_progress,completed} every 8s. The
 * owner can also drive the board manually via the "Post a task" form.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Check,
  Plus,
  X,
  Microscope,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Link2,
  Loader2,
} from "lucide-react";
import { SignaturePill } from "@/components/primitives/signature-pill";
import { useAuth } from "@/hooks/use-auth";
import { fmtAgo } from "@/lib/format";

interface AgentBrief {
  id: string;
  deviceId?: string;
  name: string;
  emoji: string;
}

interface OpenTask {
  id: string;
  taskType: string;
  bountyUsd: number;
  createdAt: number;
  expiresAt: number;
  ask: string | null;
  context: string | null;
  postingAgent: AgentBrief | null;
}

interface InProgressTask {
  id: string;
  taskType: string;
  bountyUsd: number;
  escrowSignature: string | null;
  createdAt: number;
  expiresAt: number;
  ask: string | null;
  context: string | null;
  postingAgent: AgentBrief | null;
  claimingAgent: AgentBrief | null;
}

interface CompletedTask {
  id: string;
  taskType: string;
  bountyUsd: number;
  paymentSignature: string | null;
  escrowSignature: string | null;
  completedAt: number | null;
  ask: string | null;
  context: string | null;
  postingAgent: AgentBrief | null;
  claimingAgent: AgentBrief | null;
}

interface VaultBrief {
  vault: { id: string };
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

const TASK_TYPE_VISUAL: Record<
  string,
  { label: string; bg: string; fg: string; Icon: typeof Microscope }
> = {
  research: {
    label: "Research",
    bg: "rgba(37,99,235,0.10)",
    fg: "#1D4ED8",
    Icon: Microscope,
  },
  validation: {
    label: "Validation",
    bg: "rgba(34,197,94,0.10)",
    fg: "#15803D",
    Icon: ShieldCheck,
  },
};

function visualFor(t: string): {
  label: string;
  bg: string;
  fg: string;
  Icon: typeof Microscope;
} {
  return (
    TASK_TYPE_VISUAL[t] ?? {
      label: t.replace(/_/g, " "),
      bg: "rgba(15,23,42,0.04)",
      fg: "#374151",
      Icon: TrendingUp,
    }
  );
}

export default function TasksPage() {
  const { wallet, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<"open" | "in_progress" | "completed">(
    "open",
  );
  const [open, setOpen] = useState<OpenTask[]>([]);
  const [inProgressList, setInProgressList] = useState<InProgressTask[]>([]);
  const [completed, setCompleted] = useState<CompletedTask[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);

  // Resolve device
  useEffect(() => {
    if (authLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) return;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) setDeviceId(vaults[0].vault.id);
      })
      .catch(() => {});
  }, [authLoading, wallet]);

  const load = useCallback(() => {
    const dq = deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : "";
    fetch(`/api/tasks?status=open&limit=20${dq}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.tasks && setOpen(d.tasks as OpenTask[]))
      .catch(() => {});
    fetch(`/api/tasks?status=in_progress&limit=20${dq}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.tasks && setInProgressList(d.tasks as InProgressTask[]))
      .catch(() => {});
    fetch(`/api/tasks?status=completed&limit=20${dq}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.tasks && setCompleted(d.tasks as CompletedTask[]))
      .catch(() => {});
  }, [deviceId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  const totalPaidOut = useMemo(
    () => completed.reduce((s, t) => s + t.bountyUsd, 0),
    [completed],
  );

  return (
    <div className="py-2 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#0A0A0A] mb-1">
              Jobs on your device
            </h1>
            <p className="text-[13px] text-[#6B6B6B]">
              Workers post, claim, and complete paid jobs in real USDC. Every step is enforced on-chain by your policy program.
            </p>
          </div>
          {deviceId && (
            <motion.button
              type="button"
              onClick={() => setPostOpen(true)}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[11px] text-[12.5px] font-semibold"
              style={{
                background: "#0A0A0A",
                color: "#fff",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)",
              }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
              Post a task
            </motion.button>
          )}
        </div>

        <SummaryBar
          openCount={open.length}
          inProgress={inProgressList.length}
          completedCount={completed.length}
          totalPaidOut={totalPaidOut}
        />

        <div className="flex gap-2 mt-4 flex-wrap">
          <Tab
            active={view === "open"}
            onClick={() => setView("open")}
            icon={<Clock className="w-3 h-3" />}
            label={`Open (${open.length})`}
          />
          <Tab
            active={view === "in_progress"}
            onClick={() => setView("in_progress")}
            icon={<Loader2 className="w-3 h-3" />}
            label={`In progress (${inProgressList.length})`}
          />
          <Tab
            active={view === "completed"}
            onClick={() => setView("completed")}
            icon={<Check className="w-3 h-3" />}
            label={`Completed (${completed.length})`}
          />
        </div>
      </motion.div>

      {view === "open" &&
        (open.length === 0 ? (
          <EmptyBoard view="open" />
        ) : (
          <div className="space-y-2">
            {open.map((t, i) => (
              <OpenTaskCard key={t.id} task={t} index={i} />
            ))}
          </div>
        ))}
      {view === "in_progress" &&
        (inProgressList.length === 0 ? (
          <EmptyBoard view="in_progress" />
        ) : (
          <div className="space-y-2">
            {inProgressList.map((t, i) => (
              <InProgressTaskCard key={t.id} task={t} index={i} />
            ))}
          </div>
        ))}
      {view === "completed" &&
        (completed.length === 0 ? (
          <EmptyBoard view="completed" />
        ) : (
          <div className="space-y-2">
            {completed.map((t, i) => (
              <CompletedTaskCard key={t.id} task={t} index={i} />
            ))}
          </div>
        ))}

      {postOpen && deviceId && (
        <PostTaskModal
          deviceId={deviceId}
          onClose={() => setPostOpen(false)}
          onPosted={() => {
            setPostOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ── Summary bar ────────────────────────────────────────────────────── */

function SummaryBar({
  openCount,
  inProgress,
  completedCount,
  totalPaidOut,
}: {
  openCount: number;
  inProgress: number;
  completedCount: number;
  totalPaidOut: number;
}) {
  const hasPaidOut = totalPaidOut > 0;
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: hasPaidOut
          ? "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 65%)"
          : "linear-gradient(180deg, #FFFFFF 0%, #FAFAFB 100%)",
        border: hasPaidOut
          ? "1px solid rgba(34,197,94,0.18)"
          : "1px solid rgba(15,23,42,0.06)",
        boxShadow: hasPaidOut
          ? "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04), 0 6px 16px -8px rgba(34,197,94,0.14)"
          : "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      {/* Hero: total paid out — the headline number */}
      <div
        className="flex items-baseline justify-between px-4 pt-3 pb-2.5"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div>
          <p
            className="font-mono uppercase tracking-[0.14em] mb-1"
            style={{
              color: hasPaidOut ? "#15803D" : "#9CA3AF",
              fontSize: 9.5,
              fontWeight: 600,
            }}
          >
            Total paid out
          </p>
          <span
            className="font-mono tracking-tight font-light text-[#0A0A0A]"
            style={{
              fontSize: 28,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.1,
            }}
          >
            ${totalPaidOut.toFixed(2)}
          </span>
        </div>
        {completedCount > 0 && (
          <span
            className="font-mono text-[11px]"
            style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}
          >
            across {completedCount} {completedCount === 1 ? "job" : "jobs"}
          </span>
        )}
      </div>
      {/* Sub-counts: open · in progress · completed */}
      <div className="grid grid-cols-3">
        <SummaryCell label="Open" value={openCount} tone="#15803D" />
        <SummaryCell
          label="In progress"
          value={inProgress}
          tone="#B45309"
          divider
        />
        <SummaryCell
          label="Completed"
          value={completedCount}
          tone="#374151"
          divider
        />
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
  divider,
}: {
  label: string;
  value: number;
  tone: string;
  divider?: boolean;
}) {
  return (
    <div
      className="px-3 py-2.5 flex flex-col items-center text-center"
      style={
        divider ? { borderLeft: "1px solid rgba(15,23,42,0.05)" } : undefined
      }
    >
      <span
        className="font-mono"
        style={{
          color: tone,
          fontSize: 16,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em] mt-0.5"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Tab ────────────────────────────────────────────────────────────── */

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors inline-flex items-center gap-1.5"
      style={{
        background: active ? "#0A0A0A" : "#FFFFFF",
        color: active ? "#fff" : "#9B9B9B",
        border: active ? "1px solid #0A0A0A" : "1px solid rgba(15,23,42,0.08)",
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

/* ── Cards ──────────────────────────────────────────────────────────── */

function InProgressTaskCard({
  task,
  index,
}: {
  task: InProgressTask;
  index: number;
}) {
  const v = visualFor(task.taskType);
  const Icon = v.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      className="rounded-[14px] p-3.5"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(245,158,11,0.20)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: v.bg,
                color: v.fg,
                fontSize: "9.5px",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              <Icon className="w-2.5 h-2.5" strokeWidth={2.4} />
              {v.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: "rgba(245,158,11,0.10)",
                color: "#B45309",
                fontSize: "9.5px",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={2.4} />
              IN PROGRESS
            </span>
          </div>
          <p
            className="text-[14px] text-[#0A0A0A] mb-1"
            style={{
              lineHeight: 1.42,
              fontWeight: 500,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.ask ?? task.taskType.replace(/_/g, " ")}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#6B6B6B] flex-wrap">
            {task.postingAgent && (
              <span>
                {task.postingAgent.emoji} {task.postingAgent.name}
              </span>
            )}
            <span>→</span>
            {task.claimingAgent ? (
              <span>
                {task.claimingAgent.emoji} {task.claimingAgent.name}
              </span>
            ) : (
              <span style={{ color: "#9CA3AF" }}>(unassigned)</span>
            )}
          </div>
        </div>
        <span
          className="text-[16px] font-mono font-semibold shrink-0"
          style={{ color: "#B45309" }}
        >
          ${task.bountyUsd.toFixed(3)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className="text-[10px] font-mono"
          style={{ color: "#9B9B9B" }}
        >
          claimed {fmtAgo(new Date(task.createdAt).toISOString())}
        </span>
        {task.escrowSignature && (
          <a
            href={`https://explorer.solana.com/tx/${task.escrowSignature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono"
            style={{
              background: "rgba(245,158,11,0.10)",
              color: "#B45309",
              fontSize: 10.5,
              fontWeight: 600,
            }}
            title="View escrow on Solana Explorer"
          >
            <Link2 className="w-2.5 h-2.5" strokeWidth={2.4} />
            escrow {task.escrowSignature.slice(0, 4)}…{task.escrowSignature.slice(-4)}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

function OpenTaskCard({ task, index }: { task: OpenTask; index: number }) {
  const v = visualFor(task.taskType);
  const Icon = v.Icon;
  const ttlMin = Math.max(0, Math.floor((task.expiresAt - Date.now()) / 60000));
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      className="rounded-[14px] p-3.5"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: v.bg,
                color: v.fg,
                fontSize: "9.5px",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              <Icon className="w-2.5 h-2.5" strokeWidth={2.4} />
              {v.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: "rgba(34,197,94,0.10)",
                color: "#15803D",
                fontSize: "9.5px",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              OPEN
            </span>
          </div>
          <p
            className="text-[14px] text-[#0A0A0A] mb-1"
            style={{
              lineHeight: 1.42,
              fontWeight: 500,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.ask ?? task.taskType.replace(/_/g, " ")}
          </p>
          {task.postingAgent && (
            <Link
              href={`/app/agents/${task.postingAgent.id}`}
              className="text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              posted by {task.postingAgent.emoji} {task.postingAgent.name}
            </Link>
          )}
        </div>
        <span
          className="text-[16px] font-mono font-semibold shrink-0"
          style={{ color: "#15803D" }}
        >
          ${task.bountyUsd.toFixed(3)}
        </span>
      </div>
      <div
        className="flex items-center justify-between text-[10px] font-mono"
        style={{ color: "#9B9B9B" }}
      >
        <span>created {fmtAgo(new Date(task.createdAt).toISOString())}</span>
        <span>expires in {ttlMin}m</span>
      </div>
    </motion.div>
  );
}

function CompletedTaskCard({
  task,
  index,
}: {
  task: CompletedTask;
  index: number;
}) {
  const v = visualFor(task.taskType);
  const Icon = v.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      className="rounded-[14px] p-3.5"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: v.bg,
                color: v.fg,
                fontSize: "9.5px",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              <Icon className="w-2.5 h-2.5" strokeWidth={2.4} />
              {v.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: "rgba(15,23,42,0.04)",
                color: "#6B7280",
                fontSize: "9.5px",
                letterSpacing: "0.10em",
              }}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={2.4} />
              COMPLETED
            </span>
          </div>
          <p
            className="text-[14px] text-[#0A0A0A] mb-1"
            style={{
              lineHeight: 1.42,
              fontWeight: 500,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.ask ?? task.taskType.replace(/_/g, " ")}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#6B6B6B] flex-wrap">
            {task.postingAgent && (
              <span>
                {task.postingAgent.emoji} {task.postingAgent.name}
              </span>
            )}
            <span>→</span>
            {task.claimingAgent && (
              <span>
                {task.claimingAgent.emoji} {task.claimingAgent.name}
              </span>
            )}
          </div>
        </div>
        <span
          className="text-[16px] font-mono font-semibold shrink-0"
          style={{ color: "#15803D" }}
        >
          +${task.bountyUsd.toFixed(3)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className="text-[10px] font-mono"
          style={{ color: "#9B9B9B" }}
        >
          {task.completedAt && fmtAgo(new Date(task.completedAt).toISOString())}
        </span>
        {task.paymentSignature && <SignaturePill signature={task.paymentSignature} />}
      </div>
    </motion.div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */

function EmptyBoard({
  view,
}: {
  view: "open" | "in_progress" | "completed";
}) {
  const copy =
    view === "open"
      ? "Your workers will post tasks here when they find opportunities worth validating. The first task usually appears within 10 minutes of unboxing."
      : view === "in_progress"
        ? "No claimed tasks right now. When a worker claims an open task, the escrow + claimer chain shows up here."
        : "No tasks have been completed yet. Once a worker claims and finishes a task, the on-chain payment shows up here with an Explorer link.";
  return (
    <div
      className="rounded-[16px] py-10 px-4 text-center"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <p
        className="text-[13px] mx-auto max-w-[420px] leading-[1.55]"
        style={{ color: "#6B7280" }}
      >
        {copy}
      </p>
    </div>
  );
}

/* ── PostTaskModal ──────────────────────────────────────────────────── */

function PostTaskModal({
  deviceId,
  onClose,
  onPosted,
}: {
  deviceId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [taskType, setTaskType] = useState<"research" | "validation">(
    "research",
  );
  const [ask, setAsk] = useState("");
  const [bountyUsd, setBountyUsd] = useState(0.1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (ask.trim().length < 4) {
      setError("Describe what you want done");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          taskType,
          ask: ask.trim(),
          bountyUsd,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? "could not post task");
        setSubmitting(false);
        return;
      }
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(15,23,42,0.45)" }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md mx-auto rounded-t-[20px] sm:rounded-[20px] p-5"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8F9FB 100%)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 24px 48px -16px rgba(15,23,42,0.30)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-semibold tracking-tight text-[#0A0A0A]">
              Post a task
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] inline-flex items-center justify-center"
              style={{ color: "#6B7280", background: "rgba(15,23,42,0.04)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Type picker */}
          <p
            className="font-mono uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5"
            style={{ fontSize: 9.5 }}
          >
            Type
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <TypeOption
              active={taskType === "research"}
              onClick={() => setTaskType("research")}
              icon={<Microscope className="w-3.5 h-3.5" />}
              label="Research"
              hint="Dig deeper into a finding"
            />
            <TypeOption
              active={taskType === "validation"}
              onClick={() => setTaskType("validation")}
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="Validation"
              hint="Cross-check a quick fact"
            />
          </div>

          {/* Ask textarea */}
          <p
            className="font-mono uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5"
            style={{ fontSize: 9.5 }}
          >
            What do you want done?
          </p>
          <textarea
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="e.g. Cross-check whether the Solana hot wallet swap mentioned earlier was real."
            className="w-full p-3 rounded-[12px] mb-4"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.10)",
              fontSize: 13.5,
              minHeight: 90,
              color: "#0A0A0A",
              userSelect: "text",
              WebkitUserSelect: "text",
            }}
          />

          {/* Bounty slider */}
          <div className="flex items-center justify-between mb-1">
            <p
              className="font-mono uppercase tracking-[0.14em] text-[#9CA3AF]"
              style={{ fontSize: 9.5 }}
            >
              Bounty
            </p>
            <span
              className="font-mono"
              style={{
                color: "#15803D",
                fontWeight: 600,
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${bountyUsd.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={bountyUsd}
            onChange={(e) => setBountyUsd(parseFloat(e.target.value))}
            className="w-full mb-4"
          />

          {error && (
            <p
              className="text-[12px] mb-3 font-mono"
              style={{ color: "#B45309" }}
            >
              {error}
            </p>
          )}

          <motion.button
            type="button"
            onClick={handlePost}
            disabled={submitting || ask.trim().length < 4}
            whileTap={{ scale: 0.98 }}
            className="w-full h-11 rounded-[12px] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5"
            style={{
              background: submitting || ask.trim().length < 4 ? "#9CA3AF" : "#0A0A0A",
              color: "#fff",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)",
            }}
          >
            {submitting ? "Posting…" : "Post task"}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TypeOption({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-[12px] transition-colors"
      style={{
        background: active ? "#0A0A0A" : "#FFFFFF",
        color: active ? "#fff" : "#0A0A0A",
        border: active
          ? "1px solid #0A0A0A"
          : "1px solid rgba(15,23,42,0.08)",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)"
          : "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
        {icon}
        {label}
      </span>
      <p
        className="text-[11px] mt-0.5"
        style={{ color: active ? "rgba(255,255,255,0.7)" : "#6B7280" }}
      >
        {hint}
      </p>
    </button>
  );
}
