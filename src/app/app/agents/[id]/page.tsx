"use client";

/**
 * /app/agents/[id] — Worker page (Phase 2 multi-surface redesign).
 *
 * The page now uses AgentPageShell — same architectural rhyme as the
 * /app device shell. Page header up top, two-zone grid in the middle
 * (primary cards left, configure/tools/chat right), economic timeline
 * strip at the bottom.
 *
 * Phase 3 worker reframe (drafted_application / wallet_alert /
 * trigger_*) and the configure forms (SkillsField · WatchlistEditor ·
 * TriggersEditor) are preserved. All existing API calls
 * (agent fetch · chat · status PATCH) are unchanged.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AgentPageShell } from "@/components/device/agent/agent-page-shell";
import type { ChatMessage } from "@/components/agent/chat-drawer";
import type {
  PulseConfig,
  SentinelConfig,
  WrenConfig,
} from "@/lib/agents/types";

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

export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LiveStateAction | null>(null);
  const [lastFinding, setLastFinding] = useState<LiveStateFinding | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const isFreshParam = searchParams.get("fresh") === "true";
  const showActivation =
    isFreshParam &&
    !!agent &&
    agent.totalThoughts === 0 &&
    agent.status === "alive";

  // First-tick detection (kept from prior page for parity even though
  // the new shell doesn't run a boot sequence).
  const prevThoughtsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!agent) return;
    prevThoughtsRef.current = agent.totalThoughts;
  }, [agent]);

  // Initial load — agent + chat. Economic timeline owns its own polling.
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
      setLastAction((agentJson.lastAction as LiveStateAction | null) ?? null);
      setLastFinding(
        (agentJson.lastFinding as LiveStateFinding | null) ?? null,
      );
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
  // window so totalThoughts 0→1 transitions land promptly.
  useEffect(() => {
    const intervalMs = showActivation ? 2000 : 5000;
    const iv = setInterval(() => {
      fetch(`/api/agents/${params.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.agent) setAgent(d.agent as Agent);
          setLastAction(
            (d?.lastAction as LiveStateAction | null) ?? null,
          );
          setLastFinding(
            (d?.lastFinding as LiveStateFinding | null) ?? null,
          );
        })
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
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            borderTopColor: "#0A0A0A",
          }}
        />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px]" style={{ color: "#6B7280" }}>
          {error ?? "Agent not found"}
        </p>
        <Link
          href="/app"
          className="text-[13px] underline mt-2 inline-block"
          style={{ color: "#0A0A0A" }}
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <AgentPageShell
      agent={agent}
      lastAction={lastAction}
      lastFinding={lastFinding}
      chat={chat}
      inputValue={inputValue}
      sending={sending}
      onChangeInput={setInputValue}
      onSend={handleSend}
      onPauseResume={handlePauseResume}
      onRetire={handleRetire}
    />
  );
}
