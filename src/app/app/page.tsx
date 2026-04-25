"use client";

/**
 * /app — Device home, now agent-centric.
 *
 * Shows your device + all agents living on it. Spawn new agents.
 * Recent activity feed (Atlas + your agents).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { StatBlock } from "@/components/primitives/stat-block";
import { LogEntry } from "@/components/primitives/log-entry";

interface VaultBrief {
  vault: { id: string; name: string; emoji: string; pausedAt: string | null; network: string };
  budget: { spentToday: number; dailyLimitUsd: number; dailyUtilization: number };
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  template: string;
  status: "alive" | "paused" | "retired";
  totalThoughts: number;
  totalEarnedUsd: number;
  totalSpentUsd: number;
  lastThoughtAt: number | null;
  frequencySeconds: number;
}

interface FeedEvent {
  id: string;
  timestamp: string;
  eventType: string;
  description: string;
  signature: string | null;
  amountUsd: number | null;
  counterparty: string | null;
  deviceName: string | null;
  deviceEmoji: string | null;
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

export default function DeviceHome() {
  const { wallet, isLoading } = useAuth();
  const { init } = useDeviceStore();

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
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
      .then(async (d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) {
          setVault(vaults[0]);
          init(vaults[0].vault.id);
          // Load agents on this device
          const aRes = await fetch(`/api/agents?deviceId=${vaults[0].vault.id}`);
          if (aRes.ok) {
            const aData = await aRes.json();
            setAgents(aData.agents ?? []);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet, init]);

  // Poll global firehose for the activity feed
  useEffect(() => {
    const load = () => {
      fetch("/api/log/global?limit=8")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.events && setFeed(d.events as FeedEvent[]))
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 6000);
    return () => clearInterval(iv);
  }, []);

  // Poll agents for live status
  useEffect(() => {
    if (!vault) return;
    const iv = setInterval(() => {
      fetch(`/api/agents?deviceId=${vault.vault.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.agents && setAgents(d.agents as Agent[]))
        .catch(() => {});
    }, 6000);
    return () => clearInterval(iv);
  }, [vault]);

  if (!loading && !vault) return <NoDeviceState />;

  const totalEarned = agents.reduce((sum, a) => sum + a.totalEarnedUsd, 0);
  const totalSpent = agents.reduce((sum, a) => sum + a.totalSpentUsd, 0);
  const aliveCount = agents.filter((a) => a.status === "alive").length;
  const serial = vault?.vault.id
    ? `KVN-${vault.vault.id.replace("vlt_", "").slice(0, 8).toUpperCase()}`
    : "";

  return (
    <div className="py-2">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#0A0A0A" }}
          />
        </div>
      )}

      {vault && (
        <>
          {/* Status bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-mono text-[10px] text-[#9B9B9B]">{serial}</span>
            <div className="flex items-center gap-1.5">
              <motion.span
                className="w-[6px] h-[6px] rounded-full"
                style={{ background: vault.vault.pausedAt ? "#D92D20" : "#00A86B" }}
                animate={!vault.vault.pausedAt ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] text-[#9B9B9B]">{vault.vault.network}</span>
            </div>
          </div>

          {/* Device identity card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-[24px] p-5 mb-5"
            style={{
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[28px]"
                style={{
                  background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                {vault.vault.emoji || "🧭"}
              </div>
              <div className="flex-1">
                <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0A0A]">
                  {vault.vault.name}
                </h1>
                <p className="text-[11px] text-[#9B9B9B]">
                  {aliveCount} agent{aliveCount === 1 ? "" : "s"} alive
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-3" style={{ borderTop: "1px solid #F5F5F5" }}>
              <StatBlock value={`$${totalEarned.toFixed(2)}`} label="Earned" color="#00A86B" size="md" />
              <StatBlock value={`$${totalSpent.toFixed(2)}`} label="Spent" color="#0A0A0A" size="md" />
              <StatBlock
                value={`${totalEarned - totalSpent >= 0 ? "+" : ""}$${(totalEarned - totalSpent).toFixed(2)}`}
                label="Net"
                color={totalEarned - totalSpent >= 0 ? "#00A86B" : "#D92D20"}
                size="md"
              />
            </div>
          </motion.div>

          {/* Agents */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Agents</h2>
              <Link
                href="/app/agents/spawn"
                className="flex items-center gap-1 text-[12px] font-semibold text-[#0A0A0A]"
              >
                <Plus className="w-3.5 h-3.5" />
                Spawn
              </Link>
            </div>

            {agents.length === 0 ? (
              <Link
                href="/app/agents/spawn"
                className="block rounded-[20px] p-6 text-center group transition-all hover:shadow-md active:scale-[0.98]"
                style={{ background: "#fff", border: "1px dashed rgba(0,0,0,0.1)" }}
              >
                <div
                  className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3 text-[24px]"
                  style={{ background: "#F5F5F5" }}
                >
                  ✨
                </div>
                <p className="text-[15px] font-semibold text-[#0A0A0A]">
                  Spawn your first agent
                </p>
                <p className="text-[12px] text-[#9B9B9B] mt-1 max-w-[260px] mx-auto">
                  Pick a template, give it a job, watch it think and earn.
                </p>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {agents.map((a, i) => (
                  <AgentCard key={a.id} agent={a} index={i} />
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: agents.length * 0.05 + 0.1 }}
                >
                  <Link
                    href="/app/agents/spawn"
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-[20px] h-full transition-all active:scale-[0.95]"
                    style={{ border: "1px dashed rgba(0,0,0,0.1)", minHeight: "120px" }}
                  >
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ background: "#F9FAFB" }}>
                      <span className="text-[20px] text-[#D1D5DB]">+</span>
                    </div>
                    <span className="text-[11px] text-[#9B9B9B]">Spawn</span>
                  </Link>
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Network activity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-[#9B9B9B]" />
              <h2 className="text-[12px] font-semibold text-[#9B9B9B] uppercase tracking-[0.08em]">
                Network activity
              </h2>
            </div>
            <div
              className="rounded-[20px] overflow-hidden"
              style={{
                background: "#fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {feed.length === 0 ? (
                <p className="text-[12px] text-[#D1D5DB] text-center py-6">Loading...</p>
              ) : (
                feed.slice(0, 5).map((e, i) => (
                  <div key={e.id} style={i > 0 ? { borderTop: "1px solid #F5F5F5" } : {}}>
                    <LogEntry
                      eventType={e.eventType}
                      description={e.description}
                      signature={e.signature}
                      amountUsd={e.amountUsd}
                      counterparty={e.counterparty}
                      timestamp={e.timestamp}
                      deviceName={e.deviceName}
                      deviceEmoji={e.deviceEmoji}
                    />
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <Link href="/app/devices" className="text-[11px] text-[#9B9B9B] hover:text-[#6B6B6B]">
              Device registry
            </Link>
            <span className="text-[#E5E7EB]">·</span>
            <Link href="/atlas" className="text-[11px] text-[#9B9B9B] hover:text-[#6B6B6B]">
              Atlas observatory
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const isAlive = agent.status === "alive";
  const lastMins = agent.lastThoughtAt
    ? Math.floor((Date.now() - agent.lastThoughtAt) / 60000)
    : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Link
        href={`/app/agents/${agent.id}`}
        className="block rounded-[20px] p-3.5 transition-all active:scale-[0.98]"
        style={{
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <span
            className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px]"
            style={{ background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)" }}
          >
            {agent.emoji}
          </span>
          <motion.span
            className="w-[6px] h-[6px] rounded-full mt-1.5"
            style={{ background: isAlive ? "#00A86B" : "#9B9B9B" }}
            animate={isAlive ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">{agent.name}</p>
        <p className="text-[10px] text-[#9B9B9B] mb-2">{agent.template}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#0A0A0A]">{agent.totalThoughts}</span>
          {agent.totalEarnedUsd > 0 && (
            <span className="text-[11px] font-mono text-[#00A86B]">
              +${agent.totalEarnedUsd.toFixed(3)}
            </span>
          )}
        </div>
        {lastMins != null && (
          <p className="text-[10px] text-[#D1D5DB] mt-1">
            last thought {lastMins}m ago
          </p>
        )}
      </Link>
    </motion.div>
  );
}

function NoDeviceState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-20"
    >
      <div
        className="w-[80px] h-[80px] rounded-[22px] mb-5 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <span className="text-[32px]">🧭</span>
      </div>
      <h2 className="text-[22px] font-semibold text-[#0A0A0A] tracking-tight">
        Create your device.
      </h2>
      <p className="mt-2 text-[14px] text-[#6B6B6B] max-w-[300px] leading-[1.6]">
        A sovereign wallet on Solana. Spawn agents that earn, protect, and report — no code.
      </p>
      <Link
        href="/vault/new"
        className="group mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-[14px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#0A0A0A", color: "#fff" }}
      >
        Create device
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
