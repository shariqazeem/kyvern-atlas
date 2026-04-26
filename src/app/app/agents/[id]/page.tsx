"use client";

/**
 * /app/agents/[id] — Agent detail page.
 *
 * The agent's home: identity + status + PnL + thought feed + sticky chat.
 * Polls thoughts and chat every 5s for live updates.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Pause, Play, Activity, X, Sparkles } from "lucide-react";
import { StatBlock } from "@/components/primitives/stat-block";
import { SignaturePill } from "@/components/primitives/signature-pill";

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
}

interface Thought {
  id: string;
  timestamp: number;
  thought: string;
  toolUsed: string | null;
  signature: string | null;
  amountUsd: number | null;
  counterparty: string | null;
  mode: "llm" | "scripted";
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Section 3C — fresh-spawn activation banner. Shows when the user
  // landed here from the spawn flow (?fresh=true) and the agent
  // hasn't produced its first thought yet. Disappears the moment
  // total_thoughts goes from 0 to 1.
  const isFreshParam = searchParams.get("fresh") === "true";
  const showActivation =
    isFreshParam && !!agent && agent.totalThoughts === 0 && agent.status === "alive";

  // Load agent + thoughts + chat
  const load = useCallback(async () => {
    try {
      const [agentRes, thoughtsRes, chatRes] = await Promise.all([
        fetch(`/api/agents/${params.id}`),
        fetch(`/api/agents/${params.id}/thoughts?limit=30`),
        fetch(`/api/agents/${params.id}/chat?limit=30`),
      ]);

      if (agentRes.status === 404) {
        setError("Agent not found");
        setLoading(false);
        return;
      }

      const agentJson = await agentRes.json();
      const thoughtsJson = await thoughtsRes.json();
      const chatJson = await chatRes.json();

      setAgent(agentJson.agent);
      setThoughts(thoughtsJson.thoughts ?? []);
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

  // Poll for updates. While the activation banner is showing, poll the
  // agent endpoint every 2s so the banner clears the instant the first
  // thought lands. After that, ease off to 5s.
  useEffect(() => {
    const intervalMs = showActivation ? 2000 : 5000;
    const iv = setInterval(() => {
      fetch(`/api/agents/${params.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.agent && setAgent(d.agent as Agent))
        .catch(() => {});
      fetch(`/api/agents/${params.id}/thoughts?limit=30`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.thoughts && setThoughts(d.thoughts as Thought[]))
        .catch(() => {});
      fetch(`/api/agents/${params.id}/chat?limit=30`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.messages && setChat(d.messages as ChatMessage[]))
        .catch(() => {});
    }, intervalMs);
    return () => clearInterval(iv);
  }, [params.id, showActivation]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    setSending(true);
    setInputValue("");

    // Optimistic user message
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
          // Replace optimistic + add agent response
          const filtered = prev.filter((m) => m.id !== optimistic.id);
          return [...filtered, data.userMessage, data.agentMessage];
        });
      }
    } catch {
      // Add error bubble
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
        if (res.ok) {
          setAgent((a) => (a ? { ...a, status: next } : a));
        }
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
        <p className="text-[14px] text-[#6B6B6B]">{error ?? "Agent not found"}</p>
        <Link href="/app" className="text-[13px] text-[#0A0A0A] underline mt-2 inline-block">
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

  const lastThoughtMins = agent.lastThoughtAt
    ? Math.floor((Date.now() - agent.lastThoughtAt) / 60000)
    : null;
  const isAlive = agent.status === "alive";
  const net = agent.totalEarnedUsd - agent.totalSpentUsd;

  return (
    <div className="pb-32">
      {/* Back */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9B9B9B] mb-4 hover:text-[#6B6B6B]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Home
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-[20px] p-5 mb-4"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-14 h-14 rounded-[16px] flex items-center justify-center text-[28px]"
            style={{ background: "#F5F5F5" }}
          >
            {agent.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0A0A]">
              {agent.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <motion.span
                className="w-[6px] h-[6px] rounded-full"
                style={{ background: isAlive ? "#00A86B" : "#9B9B9B" }}
                animate={isAlive ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[11px] font-medium" style={{ color: isAlive ? "#00A86B" : "#9B9B9B" }}>
                {isAlive ? "Alive" : agent.status}
              </span>
              <span className="text-[10px] text-[#D1D5DB]">·</span>
              <span className="text-[11px] text-[#9B9B9B]">{aliveLabel} alive</span>
              <span className="text-[10px] text-[#D1D5DB]">·</span>
              <span className="text-[11px] text-[#9B9B9B] font-mono">{agent.template}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {agent.status !== "retired" && (
              <button
                onClick={handlePauseResume}
                title={isAlive ? "Pause worker" : "Resume worker"}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors active:scale-[0.95]"
                style={{ background: "#F5F5F5", color: "#6B6B6B" }}
              >
                {isAlive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            {agent.status !== "retired" && (
              <button
                onClick={handleRetire}
                title="Retire worker (permanent)"
                className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors active:scale-[0.95]"
                style={{ background: "#FEE2E2", color: "#B91C1C" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 pt-4" style={{ borderTop: "1px solid #F5F5F5" }}>
          <StatBlock value={String(agent.totalThoughts)} label="Thoughts" size="md" />
          <StatBlock
            value={`$${agent.totalEarnedUsd.toFixed(2)}`}
            label="Earned"
            color="#00A86B"
            size="md"
          />
          <StatBlock
            value={`$${agent.totalSpentUsd.toFixed(2)}`}
            label="Spent"
            color="#0A0A0A"
            size="md"
          />
          <StatBlock
            value={`${net >= 0 ? "+" : ""}$${net.toFixed(2)}`}
            label="Net"
            color={net >= 0 ? "#00A86B" : "#D92D20"}
            size="md"
          />
        </div>

        {/* Last thought */}
        {lastThoughtMins !== null && (
          <p className="mt-3 text-[11px] text-[#9B9B9B]">
            Last thought: {lastThoughtMins}m ago · ticks every {agent.frequencySeconds}s
          </p>
        )}
      </motion.div>

      {/* Personality + Job */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="rounded-[16px] p-4 mb-4"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <p className="text-[10px] font-medium text-[#9B9B9B] uppercase tracking-[0.08em] mb-1">
          Personality
        </p>
        <p className="text-[13px] text-[#0A0A0A] leading-[1.5] mb-3">
          {agent.personalityPrompt}
        </p>
        <p className="text-[10px] font-medium text-[#9B9B9B] uppercase tracking-[0.08em] mb-1">
          Job
        </p>
        <p className="text-[13px] text-[#0A0A0A] leading-[1.5] mb-3">{agent.jobPrompt}</p>
        <p className="text-[10px] font-medium text-[#9B9B9B] uppercase tracking-[0.08em] mb-1">
          Tools
        </p>
        <div className="flex flex-wrap gap-1.5">
          {agent.allowedTools.map((t) => (
            <span
              key={t}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md"
              style={{ background: "#F5F5F5", color: "#6B6B6B" }}
            >
              {t}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Activation banner — appears between hero and thought feed when
          the user just spawned this worker and the first thought hasn't
          landed yet. Auto-dissolves the moment totalThoughts hits 1. */}
      <AnimatePresence>
        {showActivation && (
          <motion.div
            key="activation"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 rounded-[16px] overflow-hidden"
            style={{
              background:
                "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
              border: "1px solid rgba(74,222,128,0.25)",
              boxShadow: "0 0 24px rgba(74,222,128,0.12)",
            }}
          >
            <div className="px-5 py-4 flex items-center gap-3">
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(74,222,128,0.12)",
                  border: "1px solid rgba(74,222,128,0.45)",
                }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "#4ADE80" }} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-mono uppercase mb-0.5"
                  style={{ color: "rgba(74,222,128,0.85)", letterSpacing: "0.12em" }}
                >
                  Activating
                </div>
                <div className="text-[15px] font-semibold text-white">
                  {agent?.name} is waking up · first thought arriving
                </div>
              </div>
              <motion.div
                className="font-mono text-[11px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                ●
              </motion.div>
            </div>
            <div
              className="h-[2px] origin-left"
              style={{
                background:
                  "linear-gradient(to right, #4ADE80, rgba(74,222,128,0.05))",
              }}
            >
              <motion.div
                className="h-full"
                style={{ background: "rgba(255,255,255,0.18)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 60, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thought feed — Section 2C. Reasoning is the hero. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3.5 h-3.5 text-[#9B9B9B]" />
          <h2 className="text-[12px] font-semibold text-[#9B9B9B] uppercase tracking-[0.08em]">
            Thoughts
          </h2>
        </div>

        {thoughts.length === 0 ? (
          <div
            className="rounded-[14px] py-8 text-center text-[13px] text-[#9B9B9B]"
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.05)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {isAlive ? "Waiting for first thought…" : "Worker is paused."}
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {thoughts.map((t, i) => (
                <ThoughtCard
                  key={t.id}
                  thought={t}
                  cycleNumber={agent.totalThoughts - i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Sticky chat — Section 2C. Bubbles + breathing avatar + quick replies. */}
      <div
        className="fixed bottom-[72px] inset-x-0 z-40 px-5 sm:px-8 max-w-[680px] mx-auto"
        style={{
          background: "linear-gradient(to top, #FAFAFA 70%, rgba(250,250,250,0))",
          paddingTop: "40px",
          paddingBottom: "12px",
        }}
      >
        {/* Bubbles */}
        {(chat.length > 0 || sending) && (
          <div className="space-y-2 mb-2.5 max-h-[280px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {chat.slice(-6).map((m) => (
                <ChatBubble key={m.id} message={m} agentEmoji={agent.emoji} />
              ))}
              {sending && (chat.length === 0 || chat[chat.length - 1].role === "user") && (
                <TypingBubble key="__typing" agentEmoji={agent.emoji} />
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Quick reply chips */}
        {!sending && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setInputValue(q)}
                className="text-[11px] px-2.5 py-1 rounded-full transition active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: "#374151",
                  backdropFilter: "blur(4px)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="flex items-center gap-2 rounded-[16px] p-2"
          style={{
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={`Talk to ${agent.name}...`}
            disabled={sending}
            className="flex-1 px-2 text-[14px] outline-none bg-transparent text-[#0A0A0A] placeholder:text-[#9B9B9B]"
          />
          <button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-[0.95] disabled:opacity-30"
            style={{
              background: inputValue.trim() ? "#0A0A0A" : "#F5F5F5",
              color: inputValue.trim() ? "#fff" : "#9B9B9B",
            }}
          >
            {sending ? (
              <motion.span
                className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Quick replies ───────────────────────────────────────────────── */
const QUICK_REPLIES = [
  "How are you doing?",
  "Show me what you found",
  "Take a break",
];

/* ── ThoughtCard ─────────────────────────────────────────────────── */

function ThoughtCard({
  thought,
  cycleNumber,
}: {
  thought: Thought;
  cycleNumber: number;
}) {
  const ts = new Date(thought.timestamp);
  const hh = String(ts.getHours()).padStart(2, "0");
  const mm = String(ts.getMinutes()).padStart(2, "0");
  const ss = String(ts.getSeconds()).padStart(2, "0");
  const time = `${hh}:${mm}:${ss}`;

  const moneyKind = moneyDirection(thought.toolUsed);
  const hasFooter =
    !!thought.toolUsed || !!thought.signature || (thought.amountUsd != null && thought.amountUsd > 0);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] p-4"
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="font-mono text-[11px]" style={{ color: "#9CA3AF" }}>
          {time}
        </span>
        <ModePill mode={thought.mode} />
        <span
          className="font-mono text-[10px] ml-auto"
          style={{ color: "#9CA3AF" }}
        >
          #{cycleNumber}
        </span>
      </div>

      {/* Body — reasoning is the hero */}
      <p
        className="text-[#0A0A0A]"
        style={{ fontSize: "16px", lineHeight: 1.6 }}
      >
        {thought.thought}
      </p>

      {/* Footer */}
      {hasFooter && (
        <div
          className="flex items-center gap-2 mt-3 pt-3 flex-wrap"
          style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}
        >
          {thought.toolUsed && (
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded"
              style={{ background: "#F3F4F6", color: "#6B7280" }}
            >
              {thought.toolUsed.replace(/_/g, " ")}
            </span>
          )}
          {thought.signature && <SignaturePill signature={thought.signature} />}
          {thought.amountUsd != null && thought.amountUsd > 0 && moneyKind && (
            <MoneyDelta amount={thought.amountUsd} kind={moneyKind} />
          )}
        </div>
      )}
    </motion.article>
  );
}

function ModePill({ mode }: { mode: "llm" | "scripted" }) {
  if (mode === "llm") {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase"
        style={{
          background: "rgba(74,222,128,0.12)",
          color: "#15803D",
          fontSize: "9.5px",
          letterSpacing: "0.06em",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#22C55E" }}
        />
        mode: llm
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase"
      style={{
        background: "rgba(0,0,0,0.05)",
        color: "#6B7280",
        fontSize: "9.5px",
        letterSpacing: "0.06em",
      }}
    >
      mode: scripted
    </span>
  );
}

function MoneyDelta({
  amount,
  kind,
}: {
  amount: number;
  kind: "earned" | "spent";
}) {
  const earned = kind === "earned";
  return (
    <span
      className="font-mono font-medium"
      style={{
        color: earned ? "#16A34A" : "#D97706",
        fontSize: "12px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {earned ? "+" : "−"}${amount.toFixed(3)} {earned ? "earned" : "spent"}
    </span>
  );
}

/** Maps a tool id to whether it earns or spends (or neither). */
function moneyDirection(tool: string | null): "earned" | "spent" | null {
  if (!tool) return null;
  if (tool === "claim_task") return "earned";
  if (tool === "subscribe_to_agent" || tool === "post_task") return "spent";
  return null;
}

/* ── Chat bubbles ────────────────────────────────────────────────── */

function ChatBubble({
  message,
  agentEmoji,
}: {
  message: ChatMessage;
  agentEmoji: string;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] shrink-0 mb-0.5"
          style={{
            background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {agentEmoji || "✨"}
        </div>
      )}
      <div
        className="max-w-[85%] rounded-[16px] px-3.5 py-2 text-[13px] leading-[1.5]"
        style={{
          background: isUser ? "#0A0A0A" : "#fff",
          color: isUser ? "#fff" : "#0A0A0A",
          border: isUser ? "none" : "1px solid rgba(0,0,0,0.06)",
          boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
          whiteSpace: "pre-wrap",
          borderBottomLeftRadius: isUser ? 16 : 6,
          borderBottomRightRadius: isUser ? 6 : 16,
        }}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingBubble({ agentEmoji }: { agentEmoji: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-end gap-2 justify-start"
    >
      <motion.div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] shrink-0 mb-0.5"
        style={{
          background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {agentEmoji || "✨"}
      </motion.div>
      <div
        className="rounded-[16px] px-3.5 py-2 flex items-center gap-1"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          borderBottomLeftRadius: 6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#9CA3AF" }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
