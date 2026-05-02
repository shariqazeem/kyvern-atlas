"use client";

/**
 * /app/agents/[id] — Worker detail.
 *
 * The page IS the module — wrapped in a chassis bezel that matches the
 * device home, with the worker's status LED at the top and the worker
 * docked into a recessed slot below. Stats + spec card form the body.
 * Thought feed renders as the "internal log screen" — terminal-feel
 * mono header, hairline rows, cycle # gutter. Sticky chat at bottom is
 * a hardware-style "Talk to module" drawer with a handle and chassis
 * top-edge.
 *
 * Same APIs, same polling cadence (2s while activation banner is up,
 * 5s otherwise).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pause, Play, X } from "lucide-react";
import { ChatDrawer, type ChatMessage } from "@/components/agent/chat-drawer";
import { WelcomeNote } from "@/components/agent/welcome-note";
import { FirstMessage } from "@/components/agent/first-message";
import { BootSequence } from "@/components/agent/boot-sequence";
import { LiveWorkerCard } from "@/components/agent/live-worker-card";
import { FirstSignalToast } from "@/components/agent/first-signal-toast";
import { EconomicTimeline } from "@/components/agent/economic-timeline";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Agent {
  id: string;
  deviceId: string;
  name: string;
  emoji: string;
  personalityPrompt: string;
  jobPrompt: string;
  allowedTools: string[];
  template: string;
  frequencySeconds: number;
  status: "alive" | "paused" | "retired";
  createdAt: number;
  lastThoughtAt: number | null;
  totalThoughts: number;
  totalEarnedUsd: number;
  totalSpentUsd: number;
  metadata?: { firstMessage?: string; watchingTarget?: string } | Record<string, unknown>;
}

const QUICK_REPLIES = [
  "How are you doing?",
  "Show me what you found",
  "Take a break",
];

function deriveSerial(deviceId: string): string {
  return `KVN-${deviceId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

function moduleId(template: string): string {
  return `KVN-MOD-${template.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 14)}`;
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const isFreshParam = searchParams.get("fresh") === "true";
  const showActivation =
    isFreshParam && !!agent && agent.totalThoughts === 0 && agent.status === "alive";

  // First-signal reveal: detect totalThoughts transition 0 → 1.
  // The toast pops once, the boot sequence dissolves, and the page
  // settles into steady-state. After that we don't fire again.
  const prevThoughtsRef = useRef<number | null>(null);
  const [firstSignalReveal, setFirstSignalReveal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (!agent) return;
    const prev = prevThoughtsRef.current;
    if (prev === 0 && agent.totalThoughts > 0 && isFreshParam) {
      setFirstSignalReveal(true);
      setShowToast(true);
      // Optional chime. Browser autoplay policy may swallow it; that's
      // fine — visuals carry the moment.
      try {
        const audio = new Audio("/chime.mp3");
        audio.volume = 0.3;
        void audio.play().catch(() => {});
      } catch {
        /* ignore */
      }
    }
    prevThoughtsRef.current = agent.totalThoughts;
  }, [agent, isFreshParam]);

  // Initial load — agent + chat. Thought feed is owned by the
  // EconomicTimeline component (Phase 6) which polls its own
  // dedicated endpoint, so we don't fetch thoughts here anymore.
  const load = useCallback(async () => {
    try {
      const [agentRes, chatRes] = await Promise.all([
        fetch(`/api/agents/${params.id}`),
        fetch(`/api/agents/${params.id}/chat?limit=30`),
      ]);
      if (agentRes.status === 404) {
        setError("Agent not found");
        setLoading(false);
        return;
      }
      const agentJson = await agentRes.json();
      const chatJson = await chatRes.json();
      setAgent(agentJson.agent);
      setChat(chatJson.messages ?? []);
      setLoading(false);
    } catch {
      setError("Failed to load agent");
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll agent + chat. Faster cadence during the first-60s activation
  // window so totalThoughts 0→1 transition flips the boot sequence
  // promptly.
  useEffect(() => {
    const intervalMs = showActivation ? 2000 : 5000;
    const iv = setInterval(() => {
      fetch(`/api/agents/${params.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.agent && setAgent(d.agent as Agent))
        .catch(() => {});
      fetch(`/api/agents/${params.id}/chat?limit=30`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.messages && setChat(d.messages as ChatMessage[]))
        .catch(() => {});
    }, intervalMs);
    return () => clearInterval(iv);
  }, [params.id, showActivation]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    setSending(true);
    setInputValue("");
    const optimistic: ChatMessage = {
      id: `tmp_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setChat((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/agents/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.userMessage && data.agentMessage) {
        setChat((prev) => {
          const filtered = prev.filter((m) => m.id !== optimistic.id);
          return [...filtered, data.userMessage, data.agentMessage];
        });
      }
    } catch {
      setChat((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "agent",
          content: "(connection error)",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, params.id]);

  const setStatus = useCallback(
    async (next: "alive" | "paused" | "retired") => {
      if (!agent) return;
      try {
        const res = await fetch(`/api/agents/${params.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (res.ok) setAgent((a) => (a ? { ...a, status: next } : a));
      } catch {
        /* ignore */
      }
    },
    [agent, params.id],
  );

  const handlePauseResume = useCallback(async () => {
    if (!agent) return;
    if (agent.status === "alive") await setStatus("paused");
    else if (agent.status === "paused") await setStatus("alive");
  }, [agent, setStatus]);

  const handleRetire = useCallback(async () => {
    if (!agent) return;
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm(
        `Retire ${agent.name}? This is permanent — the worker will stop ticking and can't be brought back. Use Pause instead if you might restart it later.`,
      );
    if (!confirmed) return;
    await setStatus("retired");
  }, [agent, setStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#0A0A0A" }}
        />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px] text-[#6B6B6B]">
          {error ?? "Agent not found"}
        </p>
        <Link
          href="/app"
          className="text-[13px] text-[#0A0A0A] underline mt-2 inline-block"
        >
          Back home
        </Link>
      </div>
    );
  }

  const aliveSeconds = Math.floor((Date.now() - agent.createdAt) / 1000);
  const aliveDays = Math.floor(aliveSeconds / 86400);
  const aliveHours = Math.floor((aliveSeconds % 86400) / 3600);
  const aliveLabel =
    aliveDays > 0 ? `${aliveDays}d ${aliveHours}h` : `${aliveHours}h`;

  const firstMessageText =
    typeof (agent.metadata as { firstMessage?: string } | undefined)?.firstMessage === "string"
      ? ((agent.metadata as { firstMessage?: string }).firstMessage as string)
      : "";

  const lastThoughtMins = agent.lastThoughtAt
    ? Math.floor((Date.now() - agent.lastThoughtAt) / 60000)
    : null;
  const isAlive = agent.status === "alive";
  const net = agent.totalEarnedUsd - agent.totalSpentUsd;

  return (
    <div className="pb-[420px]">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9B9B9B] mb-3 hover:text-[#6B6B6B]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Home
      </Link>

      {/* Chassis */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full overflow-hidden mb-4"
        style={{
          borderRadius: 24,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 8px 24px -8px rgba(15,23,42,0.06)",
            "0 24px 56px -20px rgba(15,23,42,0.10)",
          ].join(", "),
        }}
      >
        {/* Top edge highlight */}
        <div
          aria-hidden
          className="absolute top-0 left-8 right-8 pointer-events-none"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
          }}
        />

        {/* LED strip */}
        <div
          className="relative flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <motion.span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background:
                  agent.status === "alive"
                    ? "#22C55E"
                    : agent.status === "paused"
                      ? "#F59E0B"
                      : "#9CA3AF",
                boxShadow:
                  agent.status === "alive"
                    ? "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)"
                    : agent.status === "paused"
                      ? "0 0 0 3px rgba(245,158,11,0.12), 0 0 8px rgba(245,158,11,0.55)"
                      : "0 0 0 3px rgba(156,163,175,0.12)",
              }}
              animate={isAlive ? { opacity: [0.55, 1, 0.55] } : {}}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="font-mono text-[10px] uppercase"
              style={{
                color:
                  agent.status === "alive"
                    ? "#15803D"
                    : agent.status === "paused"
                      ? "#B45309"
                      : "#6B7280",
                letterSpacing: "0.14em",
              }}
            >
              {agent.status === "alive"
                ? "ONLINE"
                : agent.status === "paused"
                  ? "PAUSED"
                  : "RETIRED"}
            </span>
          </div>
          <span
            className="font-mono text-[11px] tracking-[0.08em]"
            style={{ color: "#374151", textShadow: "0 1px 0 rgba(255,255,255,0.9)" }}
          >
            {moduleId(agent.template)}
          </span>
          <span
            className="font-mono text-[10px] uppercase"
            style={{ color: "#9CA3AF", letterSpacing: "0.12em" }}
          >
            Up {aliveLabel}
          </span>
        </div>

        {/* Identity row */}
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[28px] shrink-0"
              style={{
                background: "linear-gradient(180deg, #F2F3F5 0%, #FFFFFF 100%)",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow:
                  "inset 0 1px 2px rgba(15,23,42,0.06), inset 0 -1px 0 rgba(255,255,255,0.8)",
              }}
            >
              {agent.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0A0A] leading-tight">
                {agent.name}
              </h1>
              <div
                className="font-mono text-[11px] mt-1 flex flex-wrap items-center gap-1.5"
                style={{ color: "#9CA3AF" }}
              >
                <span className="text-[#374151]">{agent.template}</span>
                <span style={{ color: "#D1D5DB" }}>·</span>
                <span>docked into</span>
                <Link
                  href="/app"
                  className="text-[#374151] hover:text-[#0A0A0A] transition"
                >
                  {deriveSerial(agent.deviceId)}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {agent.status !== "retired" && (
                <motion.button
                  onClick={handlePauseResume}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
                  title={isAlive ? "Pause worker" : "Resume worker"}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: "#FFFFFF",
                    color: "#374151",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                  }}
                >
                  {isAlive ? (
                    <Pause className="w-4 h-4" strokeWidth={1.7} />
                  ) : (
                    <Play className="w-4 h-4" strokeWidth={1.7} />
                  )}
                </motion.button>
              )}
              {agent.status !== "retired" && (
                <motion.button
                  onClick={handleRetire}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
                  title="Retire worker (permanent)"
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    border: "1px solid rgba(185,28,28,0.18)",
                  }}
                >
                  <X className="w-4 h-4" strokeWidth={1.8} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Compact economics line — replaces the old 4-stat grid.
              The Economic Timeline below shows the per-action detail;
              this is the at-a-glance summary. */}
          <div
            className="rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap"
            style={{
              background: "rgba(15,23,42,0.025)",
              border: "1px solid rgba(15,23,42,0.05)",
            }}
          >
            <div
              className="font-mono inline-flex items-baseline gap-1.5"
              style={{
                color: "#374151",
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: "#15803D", fontWeight: 600 }}>
                +${agent.totalEarnedUsd.toFixed(2)}
              </span>
              <span style={{ color: "#9CA3AF", fontSize: 10.5 }}>earned</span>
              <span style={{ color: "#D1D5DB", margin: "0 2px" }}>·</span>
              <span style={{ color: "#374151", fontWeight: 500 }}>
                ${agent.totalSpentUsd.toFixed(2)}
              </span>
              <span style={{ color: "#9CA3AF", fontSize: 10.5 }}>spent</span>
              <span style={{ color: "#D1D5DB", margin: "0 2px" }}>·</span>
              <span
                style={{
                  color: net >= 0 ? "#15803D" : "#B91C1C",
                  fontWeight: 600,
                }}
              >
                {net >= 0 ? "+" : ""}${net.toFixed(2)}
              </span>
              <span style={{ color: "#9CA3AF", fontSize: 10.5 }}>net</span>
            </div>
            <span
              className="font-mono"
              style={{
                color: "#9CA3AF",
                fontSize: 10.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {agent.totalThoughts} {agent.totalThoughts === 1 ? "check" : "checks"}
            </span>
          </div>

          {/* Last-check line */}
          {lastThoughtMins !== null && (
            <p className="mt-3 font-mono text-[10.5px]" style={{ color: "#9CA3AF" }}>
              Last check {lastThoughtMins}m ago · runs every{" "}
              {agent.frequencySeconds}s
            </p>
          )}
        </div>
      </motion.div>

      {/* Spec card — Personality / Job / Tools */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: EASE }}
        className="rounded-[16px] p-4 mb-4"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
        }}
      >
        <SpecBlock label="Personality">
          <p className="text-[13px] text-[#0A0A0A] leading-[1.55]">
            {agent.personalityPrompt}
          </p>
        </SpecBlock>
        <SpecBlock label="Job">
          <p className="text-[13px] text-[#0A0A0A] leading-[1.55]">
            {agent.jobPrompt}
          </p>
        </SpecBlock>
        <SpecBlock label="Tools" last>
          <div className="flex flex-wrap gap-1.5">
            {agent.allowedTools.map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] px-2 py-0.5 rounded-md"
                style={{
                  background: "rgba(15,23,42,0.04)",
                  color: "#374151",
                  border: "1px solid rgba(15,23,42,0.05)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </SpecBlock>
      </motion.div>

      {/* First-60s region — replaces the old activation banner.
          Desktop: two-column (welcome+message+boot on left, live card on right).
          Mobile: vertical stack with the live card as a collapsible pill.
          The Live Worker Card and First Message persist past first
          signal — they're owner-feeling artifacts that survive boot. */}
      {firstMessageText && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
          <div className="min-w-0">
            <WelcomeNote
              name={agent.name}
              serial={deriveSerial(agent.deviceId)}
              hiredAt={agent.createdAt}
              alive={agent.totalThoughts > 0}
            />
            <FirstMessage
              emoji={agent.emoji}
              message={firstMessageText}
              instant={agent.totalThoughts > 0 && !firstSignalReveal}
            />
            {showActivation && (
              <BootSequence
                agentId={agent.id}
                spawnedAt={agent.createdAt}
                dissolveSignal={firstSignalReveal}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="md:sticky md:top-4">
              {/* Mobile renders pill; desktop renders the full card. */}
              <div className="md:hidden">
                <LiveWorkerCard agentId={agent.id} variant="pill" />
              </div>
              <div className="hidden md:block">
                <LiveWorkerCard agentId={agent.id} variant="card" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 6 — Economic Activity Timeline replaces the raw
          internal-log thought feed. The previous feed surfaced every
          tick (anti-noise included), which made the page feel like
          debug output. The timeline shows only money-moving actions
          + their on-chain signatures, which is what owners actually
          care about. */}
      <EconomicTimeline agentId={agent.id} isAlive={isAlive} />

      {/* Sticky chat drawer */}
      <ChatDrawer
        agentName={agent.name}
        agentEmoji={agent.emoji}
        chat={chat}
        sending={sending}
        inputValue={inputValue}
        onChangeInput={setInputValue}
        onSend={handleSend}
        quickReplies={QUICK_REPLIES}
      />

      {/* First-signal toast — only fires on the totalThoughts 0→1
          transition during a fresh load. Auto-dismisses after 6s. */}
      <FirstSignalToast
        show={showToast}
        agentName={agent.name}
        onDismiss={() => setShowToast(false)}
      />
    </div>
  );
}

/* ── SpecBlock ────────────────────────────────────────────────────── */

function SpecBlock({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={last ? "" : "mb-3 pb-3"}
      style={
        last ? undefined : { borderBottom: "1px solid rgba(15,23,42,0.04)" }
      }
    >
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

