"use client";

/**
 * AgentPageShell — Phase B (KYVERN_FRONTIER_FINAL_SPRINT, 2026-05-08).
 *
 * Apple-Settings-style single-column worker page. The previous design
 * tried to fit a 2- or 3-column grid (About | Configure | Tools/Talk)
 * into the same surface; with the new framing — "the device is the
 * product, workers are templates" — that grid created tension between
 * three competing primary actions.
 *
 * The new structure is a vertical flow at max-width 720px:
 *
 *   ┌──────────────────────────────┐
 *   │  Header (thin, page-shell)   │
 *   ├──────────────────────────────┤
 *   │  Hero — no card chrome       │
 *   │    📈 Conditional Trigger    │
 *   │    purpose copy              │
 *   │    ● status pill             │
 *   ├──────────────────────────────┤
 *   │  LIVE STATE                  │
 *   │  ─────                       │
 *   │  Spotted X · sig ↗           │
 *   ├──────────────────────────────┤
 *   │  CONFIGURE  (primary action) │
 *   │  ─────                       │
 *   │  template-specific editor    │
 *   ├──────────────────────────────┤
 *   │  HOW {NAME} WORKS            │
 *   │  ─────                       │
 *   │  · plain-language bullets    │
 *   │  Chain caps the spend at …   │
 *   ├──────────────────────────────┤
 *   │  Talk to {name}      [⌃]     │
 *   ├──────────────────────────────┤
 *   │  RECENT ACTIVITY             │
 *   │  ─────                       │
 *   │  rows                        │
 *   └──────────────────────────────┘
 *
 * Section dividers are thin hairlines between blocks; section
 * headings use small-caps mono with a 12px hairline rule beneath.
 * No card chrome around individual sections — this is what makes
 * the page feel native iOS Settings instead of a SaaS dashboard.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Play,
  Send,
  X,
} from "lucide-react";
import { WorkerEmoji } from "@/components/icons/worker-emoji";
import { PageHeader } from "../shell/page-header";
import { isPersonalized } from "@/lib/device-state";
import { SkillsField } from "@/components/agents/configure/skills-field";
import { WatchlistEditor } from "@/components/agents/configure/watchlist-editor";
import { TriggersEditor } from "@/components/agents/configure/triggers-editor";
import { EconomicTimeline } from "@/components/agent/economic-timeline";
import type { ChatMessage } from "@/components/agent/chat-drawer";
import type {
  AgentTemplate,
  PulseConfig,
  SentinelConfig,
  WrenConfig,
} from "@/lib/agents/types";
import { WORKER_PAGE_CONTENT } from "@/lib/workers/page-content";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const MAX_W = 720;

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
  // Phase A.3 (KYVERN_FRONTIER_FINAL_SPRINT, 2026-05-08) — Wren never
  // says "earned from treasury" again. The previous live-state copy
  // surfaced lastAction.message, which was the intra-device task
  // economy talking ("Completed validation. Earned $0.10 from
  // treasury …"). Wren's actual job is watching wallets — when it
  // hasn't surfaced anything material we synthesise an honest
  // watch-state from the configured watchlist + last check.
  if (agent.template === "whale_tracker") {
    const watchlist =
      (agent.config as WrenConfig | undefined)?.watchlist ?? [];
    if (watchlist.length === 0) {
      return "No wallets watched yet — add some in Configure.";
    }
    const ago = agent.lastThoughtAt ? fmtAgo(agent.lastThoughtAt) : "no cycles yet";
    return `Watching ${watchlist.length} ${
      watchlist.length === 1 ? "wallet" : "wallets"
    } · nothing material in last ${ago}`;
  }
  // Phase A.3 — Pulse and Sentinel keep the lastAction.message path
  // for now; Pulse's pulse_trigger_fire writes a clean message on
  // success/blocked, Sentinel's drafted_application is the same.
  if (lastAction?.message) {
    return lastAction.message;
  }
  if (agent.totalThoughts === 0) return "Booting…";
  if (agent.lastThoughtAt) {
    return `Idle · last check ${fmtAgo(agent.lastThoughtAt)}`;
  }
  return "Standing by";
}

function getContent(template: string) {
  return (
    WORKER_PAGE_CONTENT[template as AgentTemplate] ??
    WORKER_PAGE_CONTENT.custom
  );
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
  const isAlive = agent.status === "alive";
  const isPaused = agent.status === "paused";
  const liveState = liveStateString(agent, lastFinding, lastAction);
  const stateColor =
    agent.status === "retired"
      ? "#6B7280"
      : isPaused
        ? "#F59E0B"
        : "#22C55E";
  const content = getContent(agent.template);

  const header = (
    <PageHeader
      back={{ href: "/app", label: "Device" }}
      left={
        <>
          <WorkerEmoji emoji={agent.emoji} size={18} />
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

      {/* Single-column flow capped at 720px — generous side gutters
          on desktop, edge-padded on phones. No card chrome around
          sections; hairline rules between blocks carry the rhythm. */}
      <main
        className="flex-1 min-h-0 mx-auto w-full px-6 sm:px-8"
        style={{ maxWidth: MAX_W }}
      >
        {/* HERO — no card. Emoji + role + purpose + status pill. */}
        <section className="pt-12 sm:pt-14 pb-2">
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #F5F7FB 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04), 0 8px 22px -10px rgba(15,23,42,0.10)",
              color: "#0A0A0A",
            }}
          >
            <WorkerEmoji emoji={content.icon} size={32} strokeWidth={1.5} />
          </div>
          <h1
            className="font-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] mb-3"
            style={{ color: "#0A0A0A", lineHeight: 1.05 }}
          >
            {content.role}
          </h1>
          <p
            className="text-[15px] sm:text-[16px] leading-[1.55] max-w-[600px]"
            style={{ color: "#475569" }}
          >
            {content.purpose}
          </p>
          <div className="mt-5 inline-flex items-center gap-2">
            <motion.span
              className="rounded-full inline-block"
              style={{
                width: 7,
                height: 7,
                background: stateColor,
                boxShadow: isAlive
                  ? `0 0 0 2.5px rgba(34,197,94,0.18), 0 0 6px ${stateColor}`
                  : undefined,
              }}
              animate={isAlive ? { opacity: [0.55, 1, 0.55] } : {}}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 10, color: "rgba(15,23,42,0.55)" }}
            >
              {isPaused ? "Paused" : isAlive ? "Alive" : "Retired"}
              {" · "}
              {agent.lastThoughtAt
                ? `last check ${fmtAgo(agent.lastThoughtAt)}`
                : "no cycles yet"}
            </span>
          </div>
        </section>

        {/* LIVE STATE */}
        <Section label="Live state">
          <p
            className="text-[16px] sm:text-[17px] leading-[1.5] tracking-[-0.005em]"
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
        </Section>

        {/* CONFIGURE — primary action */}
        <Section label="Configure">
          {!isPersonalized({
            template: agent.template,
            config: agent.config,
          }) && (
            <p
              className="text-[12.5px] italic mb-3"
              style={{ color: "rgba(15,23,42,0.55)" }}
            >
              Starter settings. Tell it about you below — saves take effect
              immediately.
            </p>
          )}
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
            <p className="text-[13px]" style={{ color: "#6B7280" }}>
              Custom workers configure via spawn-time job prompt.
            </p>
          )}
        </Section>

        {/* HOW IT WORKS */}
        <Section label={`How ${agent.name} works`}>
          <ul className="flex flex-col gap-2 text-[13.5px] leading-[1.6]">
            {content.howItWorks.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5"
                style={{ color: "#374151" }}
              >
                <span
                  aria-hidden
                  className="flex-none mt-[2px]"
                  style={{ color: "rgba(15,23,42,0.30)", fontSize: 14 }}
                >
                  ·
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p
            className="text-[12px] mt-4 pt-3"
            style={{
              borderTop: "1px solid rgba(15,23,42,0.05)",
              color: "rgba(15,23,42,0.55)",
            }}
          >
            {content.chainNote}
          </p>
        </Section>

        {/* TALK — collapsible */}
        <Section flush>
          <TalkSection
            agentName={agent.name}
            chat={chat}
            inputValue={inputValue}
            sending={sending}
            onChangeInput={onChangeInput}
            onSend={onSend}
          />
        </Section>

        {/* RECENT ACTIVITY */}
        <Section label="Recent activity" lastBlock>
          <EconomicTimeline agentId={agent.id} isAlive={isAlive} />
        </Section>
      </main>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Section / TalkSection / ChatBubble helpers
   ──────────────────────────────────────────────────────────────────── */

/**
 * Section — generic single-column block with the small-caps mono
 * label + 12px hairline rule + content. No card chrome. The
 * "lastBlock" prop drops the bottom margin so the page doesn't have
 * dead space above the OS tab bar.
 */
function Section({
  label,
  children,
  flush,
  lastBlock,
}: {
  label?: string;
  children: React.ReactNode;
  /** No header, just spacing — for surfaces that own their own header
   *  (Talk's collapsible button). */
  flush?: boolean;
  lastBlock?: boolean;
}) {
  return (
    <section
      className={`pt-10 sm:pt-12 ${lastBlock ? "pb-12" : "pb-2"}`}
      style={
        flush
          ? undefined
          : { borderTop: "1px solid rgba(15,23,42,0.06)" }
      }
    >
      {!flush && label && (
        <div className="mb-5">
          <div
            className="font-mono uppercase tracking-[0.18em] mb-1.5"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
          >
            {label}
          </div>
          <div
            aria-hidden
            style={{
              height: 1,
              width: 28,
              background: "rgba(15,23,42,0.18)",
            }}
          />
        </div>
      )}
      {children}
    </section>
  );
}

/** Collapsible Talk-to-{name}. Defaults closed when there are no
 *  messages — first-time visitors see Configure as the primary
 *  action without an empty chat eating screen real estate. */
function TalkSection({
  agentName,
  chat,
  inputValue,
  sending,
  onChangeInput,
  onSend,
}: {
  agentName: string;
  chat: ChatMessage[];
  inputValue: string;
  sending: boolean;
  onChangeInput: (v: string) => void;
  onSend: () => void;
}) {
  const [open, setOpen] = useState(chat.length > 0);
  return (
    <div
      className="pt-10 sm:pt-12"
      style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-1"
        aria-expanded={open}
      >
        <div>
          <div
            className="font-mono uppercase tracking-[0.18em] mb-1.5 inline-flex items-center"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
          >
            Talk to {agentName}
            {chat.length > 0 && (
              <span
                className="ml-2 normal-case font-sans"
                style={{
                  letterSpacing: 0,
                  fontSize: 11,
                  color: "rgba(15,23,42,0.45)",
                }}
              >
                {chat.length} {chat.length === 1 ? "message" : "messages"}
              </span>
            )}
          </div>
          <div
            aria-hidden
            style={{
              height: 1,
              width: 28,
              background: "rgba(15,23,42,0.18)",
            }}
          />
        </div>
        <span
          className="rounded-full p-1"
          style={{ color: "rgba(15,23,42,0.45)" }}
        >
          {open ? (
            <ChevronUp className="w-4 h-4" strokeWidth={2} />
          ) : (
            <ChevronDown className="w-4 h-4" strokeWidth={2} />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="talk-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-5">
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto mb-3 pr-1">
                {chat.length === 0 && (
                  <div
                    className="text-[12.5px] text-center py-3"
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
                  placeholder={`Message ${agentName}…`}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
