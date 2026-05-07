"use client";

/**
 * AgentPageShell — Phase 2 (Final Polish + Multi-Surface).
 *
 * The worker page becomes a "mini /app" for one specific worker.
 * Same architectural rhyme as /app: page header up top, two-zone
 * grid in the middle, bottom strip, shared tab bar.
 *
 * Primary zone (left, ~60%):
 *   1. Live state card (hero)
 *   2. About card (WHAT I DO FOR YOU)
 *   3. Observability card (WATCHING · CHECKED · STATE + budget)
 *   4. Greeting card
 *
 * Secondary zone (right, ~380px):
 *   5. Configure card (template-specific form)
 *   6. Tools card
 *   7. Chat card
 *
 * Bottom strip:
 *   8. Economic timeline (compact horizontal)
 */

import { motion } from "framer-motion";
import { Pause, Play, X, Send, ExternalLink } from "lucide-react";
import { PageHeader } from "../shell/page-header";
import { isPersonalized } from "@/lib/device-state";
import { SkillsField } from "@/components/agents/configure/skills-field";
import { WatchlistEditor } from "@/components/agents/configure/watchlist-editor";
import { TriggersEditor } from "@/components/agents/configure/triggers-editor";
import { EconomicTimeline } from "@/components/agent/economic-timeline";
import type { ChatMessage } from "@/components/agent/chat-drawer";
import type {
  PulseConfig,
  SentinelConfig,
  WrenConfig,
} from "@/lib/agents/types";

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
  metadata?: Record<string, unknown>;
  config?: SentinelConfig | WrenConfig | PulseConfig | Record<string, unknown>;
}

interface LiveStateAction {
  signature: string | null;
  signatureStatus: "success" | "failed" | null;
  amountUsd: number | null;
  counterparty: string | null;
  message: string | null;
  brand: string | null;
  timestamp: number;
}

interface LiveStateFinding {
  kind: string;
  subject: string;
  brand: string | null;
  ts: number;
}

interface Props {
  agent: Agent;
  lastAction: LiveStateAction | null;
  lastFinding: LiveStateFinding | null;
  chat: ChatMessage[];
  inputValue: string;
  sending: boolean;
  onChangeInput: (v: string) => void;
  onSend: () => void;
  onPauseResume: () => void;
  onRetire: () => void;
}

const QUICK_REPLIES = [
  "How are you doing?",
  "Show me what you found",
  "Take a break",
];

function deriveSerial(deviceId: string): string {
  return `KVN-${deviceId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

function templateLabel(t: string): string {
  if (t === "bounty_hunter") return "Bounty Scout";
  if (t === "whale_tracker") return "Position Watchtower";
  if (t === "token_pulse") return "Conditional Trigger";
  return "Custom worker";
}

function templateBlurb(t: string): string {
  if (t === "bounty_hunter")
    return "I find paid Solana bounties matching your skills, draft your application with Pay.sh / Gemini, and queue it for one-tap submit.";
  if (t === "whale_tracker")
    return "Pick wallets or contracts to watch. I ping you when something material moves. Chain caps how often I check.";
  if (t === "token_pulse")
    return "Set a price condition. I poll the market with Pay.sh / Gemini reasoning. The moment it triggers, I fire your pre-approved spend — and the chain checks every dollar.";
  return "Custom worker — see Configure for what you told me to do.";
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function uptimeLabel(createdAt: number): string {
  const secs = Math.floor((Date.now() - createdAt) / 1000);
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function liveStateString(
  agent: Agent,
  lastFinding: LiveStateFinding | null,
  lastAction: LiveStateAction | null,
): string {
  if (lastFinding) {
    return `Spotted ${lastFinding.subject}`;
  }
  if (lastAction?.message) {
    return lastAction.message;
  }
  if (agent.totalThoughts === 0) return "Booting…";
  if (agent.lastThoughtAt) {
    return `Idle · last check ${fmtAgo(agent.lastThoughtAt)}`;
  }
  return "Standing by";
}

export function AgentPageShell({
  agent,
  lastAction,
  lastFinding,
  chat,
  inputValue,
  sending,
  onChangeInput,
  onSend,
  onPauseResume,
  onRetire,
}: Props) {
  const serial = deriveSerial(agent.deviceId);
  const isAlive = agent.status === "alive";
  const isPaused = agent.status === "paused";
  const liveState = liveStateString(agent, lastFinding, lastAction);
  const stateColor =
    agent.status === "retired"
      ? "#6B7280"
      : isPaused
        ? "#F59E0B"
        : "#22C55E";

  const firstMessageText =
    typeof (agent.metadata as { firstMessage?: string } | undefined)
      ?.firstMessage === "string"
      ? ((agent.metadata as { firstMessage?: string }).firstMessage as string)
      : "";

  // Header trimmed to: ← Device · 🎯 Sentinel · Up Xh Ym · N checks · ⏸ ✕
  // Template label lives in the About card (giant title); serial lives in
  // the OS bar top-right. Both dropped here to stop overpacking.
  void serial; // suppress unused warning — kept for trace + future need
  const header = (
    <PageHeader
      back={{ href: "/app", label: "Device" }}
      left={
        <>
          <span style={{ fontSize: 18 }}>{agent.emoji}</span>
          <span
            className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.005em] truncate"
            style={{ color: "#0A0A0A" }}
          >
            {agent.name}
          </span>
        </>
      }
      right={
        <>
          <span
            className="hidden sm:inline-flex font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Up {uptimeLabel(agent.createdAt)} · {agent.totalThoughts} checks
          </span>
          <button
            type="button"
            onClick={onPauseResume}
            className="rounded-full p-1.5 hover:bg-black/5 transition"
            aria-label={isAlive ? "Pause" : "Resume"}
            title={isAlive ? "Pause" : "Resume"}
          >
            {isAlive ? (
              <Pause
                className="w-3.5 h-3.5"
                strokeWidth={2}
                style={{ color: "rgba(15,23,42,0.55)" }}
              />
            ) : (
              <Play
                className="w-3.5 h-3.5"
                strokeWidth={2}
                style={{ color: "#15803D" }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={onRetire}
            className="rounded-full p-1.5 hover:bg-black/5 transition"
            aria-label="Retire"
            title="Retire"
          >
            <X
              className="w-3.5 h-3.5"
              strokeWidth={2}
              style={{ color: "rgba(15,23,42,0.55)" }}
            />
          </button>
        </>
      }
    />
  );

  // Live State as a full-width hero strip, then 3-column grid below
  // (About + Observability + Greeting · Configure · Tools + Chat).
  // The agent page bypasses PageShell's 2-zone grid in favour of a
  // custom three-column layout.
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="device-shell flex flex-col mx-auto w-full"
      style={{
        maxWidth: 1440,
        minHeight: "calc(100dvh - 88px)",
      }}
    >
      {header}

      {/* Live State — full-width hero. The hero of the page deserves
          the width. Spans the entire main below the page header. */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 flex-shrink-0">
        <Card>
          <Eyebrow>
            <motion.span
              className="rounded-full inline-block mr-1.5"
              style={{
                width: 6,
                height: 6,
                background: stateColor,
                boxShadow: isAlive
                  ? `0 0 0 2px rgba(34,197,94,0.18), 0 0 6px ${stateColor}`
                  : undefined,
              }}
              animate={isAlive ? { opacity: [0.55, 1, 0.55] } : {}}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            Live state
          </Eyebrow>
          <p
            className="text-[18px] sm:text-[20px] leading-[1.45] tracking-[-0.01em]"
            style={{ color: "#0A0A0A", fontWeight: 500 }}
          >
            {liveState}
          </p>
          {lastAction?.signature && (
            <a
              href={`https://explorer.solana.com/tx/${lastAction.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono mt-2"
              style={{ fontSize: 11, color: "#15803D" }}
            >
              {lastAction.signature.slice(0, 6)}…
              {lastAction.signature.slice(-4)}
              <ExternalLink className="w-3 h-3" strokeWidth={2} />
            </a>
          )}
        </Card>
      </div>

      {/* 3-column grid below the hero — collapses to 1 column on mobile,
          2 columns on tablet, 3 columns on desktop. */}
      <main className="flex-1 min-h-0 grid gap-3 sm:gap-4 p-4 sm:p-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        {/* COL 1 — About + Observability + Greeting */}
        <section className="flex flex-col gap-3 sm:gap-4 min-w-0">
          <Card>
            <Eyebrow>What I do for you</Eyebrow>
            <h3
              className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.012em] mb-2"
              style={{ color: "#0A0A0A" }}
            >
              {templateLabel(agent.template)}
            </h3>
            <p
              className="text-[13.5px] leading-[1.6]"
              style={{ color: "#6B7280" }}
            >
              {templateBlurb(agent.template)}
            </p>
          </Card>

          <Card>
            <Eyebrow>Observability</Eyebrow>
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Watching"
                value={
                  agent.template === "bounty_hunter"
                    ? "Ecosystem feeds"
                    : agent.template === "whale_tracker"
                      ? "Wallet watchlist"
                      : agent.template === "token_pulse"
                        ? "Price triggers"
                        : "Custom"
                }
              />
              <Stat
                label="Checked"
                value={
                  agent.lastThoughtAt ? fmtAgo(agent.lastThoughtAt) : "—"
                }
              />
              <Stat
                label="State"
                value={
                  isPaused ? "Paused" : isAlive ? "Alive" : "Retired"
                }
                tone={isPaused ? "amber" : isAlive ? "green" : "gray"}
              />
            </div>
            <div
              className="flex items-baseline gap-3 mt-3 pt-3 font-mono"
              style={{
                borderTop: "1px solid rgba(15,23,42,0.06)",
                fontSize: 10.5,
                color: "rgba(15,23,42,0.55)",
              }}
            >
              <span>Runs every {agent.frequencySeconds}s</span>
              <span aria-hidden style={{ color: "rgba(15,23,42,0.20)" }}>
                ·
              </span>
              <span>{agent.allowedTools.length} tools</span>
            </div>
          </Card>

          {firstMessageText && (
            <Card>
              <Eyebrow>Greeting</Eyebrow>
              <p
                className="text-[13.5px] leading-[1.6] italic"
                style={{ color: "#374151" }}
              >
                “{firstMessageText}”
              </p>
            </Card>
          )}
        </section>

        {/* COL 2 — Configure */}
        <section className="flex flex-col gap-3 sm:gap-4 min-w-0">
          {!isPersonalized({
            template: agent.template,
            config: agent.config,
          }) && (
            <p
              className="text-[12px] italic px-1"
              style={{ color: "rgba(15,23,42,0.55)" }}
            >
              This worker is using starter settings. Tell it about you below
              — your saves take effect immediately.
            </p>
          )}
          <Card>
            <Eyebrow>Configure</Eyebrow>
            {agent.template === "bounty_hunter" && (
              <SkillsField
                agentId={agent.id}
                initial={
                  ((agent.config as SentinelConfig) ?? {
                    skills: "Solana developer · Rust · TypeScript",
                    min_payout_usd: 300,
                    cadence_minutes: 10,
                  }) as SentinelConfig
                }
              />
            )}
            {agent.template === "whale_tracker" && (
              <WatchlistEditor
                agentId={agent.id}
                initial={
                  ((agent.config as WrenConfig) ?? {
                    watchlist: [],
                    cadence_minutes: 5,
                  }) as WrenConfig
                }
              />
            )}
            {agent.template === "token_pulse" && (
              <TriggersEditor
                agentId={agent.id}
                initial={
                  ((agent.config as PulseConfig) ?? {
                    triggers: [],
                    cadence_minutes: 1,
                  }) as PulseConfig
                }
              />
            )}
            {!["bounty_hunter", "whale_tracker", "token_pulse"].includes(
              agent.template,
            ) && (
              <p
                className="text-[12.5px]"
                style={{ color: "#6B7280" }}
              >
                Custom workers configure via spawn-time job prompt.
              </p>
            )}
          </Card>
        </section>

        {/* COL 3 — Tools + Chat */}
        <section className="flex flex-col gap-3 sm:gap-4 min-w-0">
          <Card>
            <Eyebrow>Tools · {agent.allowedTools.length}</Eyebrow>
            <ul className="flex flex-col gap-1">
              {agent.allowedTools.map((t) => (
                <li
                  key={t}
                  className="font-mono text-[11.5px] flex items-center gap-1.5"
                  style={{ color: "rgba(15,23,42,0.70)" }}
                >
                  <span
                    aria-hidden
                    style={{ color: "rgba(15,23,42,0.30)" }}
                  >
                    •
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <Eyebrow>Talk to {agent.name}</Eyebrow>
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto mb-3 pr-1">
              {chat.length === 0 && (
                <div
                  className="text-[12px] text-center py-3"
                  style={{ color: "rgba(15,23,42,0.40)" }}
                >
                  No messages yet. Try a suggestion below.
                </div>
              )}
              {chat.map((m) => (
                <ChatBubble key={m.id} role={m.role} content={m.content} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChangeInput(q)}
                  className="text-[10.5px] rounded-full px-2.5 py-1 transition hover:bg-black/5"
                  style={{
                    background: "rgba(15,23,42,0.04)",
                    color: "rgba(15,23,42,0.65)",
                    border: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-1.5">
              <textarea
                value={inputValue}
                onChange={(e) => onChangeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder={`Message ${agent.name}…`}
                rows={2}
                className="flex-1 px-3 py-2 rounded-[10px] outline-none resize-none"
                style={{
                  fontSize: 12.5,
                  background: "#FAFAFA",
                  border: "1px solid rgba(15,23,42,0.08)",
                  color: "#0A0A0A",
                  lineHeight: 1.5,
                }}
              />
              <button
                type="button"
                onClick={onSend}
                disabled={sending || !inputValue.trim()}
                className="rounded-[10px] p-2 transition disabled:opacity-50"
                style={{
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.8)",
                }}
                aria-label="Send"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </Card>
        </section>
      </main>

      {/* Economic timeline strip */}
      <div
        className="flex-shrink-0 px-4 sm:px-6 py-2.5"
        style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div
          className="font-mono uppercase tracking-[0.18em] mb-1"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
        >
          Economic timeline
        </div>
        <EconomicTimeline agentId={agent.id} isAlive={isAlive} />
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Card / Eyebrow / Stat / ChatBubble / Sep helpers
   ──────────────────────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="rounded-2xl bg-white px-5 py-4"
      style={{
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono uppercase tracking-[0.18em] mb-2 inline-flex items-center"
      style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "gray";
}) {
  const fg =
    tone === "green"
      ? "#15803D"
      : tone === "amber"
        ? "#B45309"
        : "#0A0A0A";
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 8.5, color: "rgba(15,23,42,0.45)" }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-semibold tracking-[-0.005em] truncate"
        style={{ color: fg }}
      >
        {value}
      </span>
    </div>
  );
}

function ChatBubble({
  role,
  content,
}: {
  role: "user" | "agent";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="rounded-[10px] px-3 py-2 max-w-[85%]"
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        background: isUser ? "#0A0A0A" : "rgba(15,23,42,0.04)",
        color: isUser ? "#FFFFFF" : "#0A0A0A",
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      {content}
    </motion.div>
  );
}

