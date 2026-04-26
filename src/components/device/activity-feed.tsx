"use client";

/**
 * Activity feed beneath the device hero card.
 *
 * Five rows. Monospace. Mirrors the latest events on this device.
 * Format: `14:31:22 · Sentinel · earned $0.01 · 5Kj7…fN2x ↗`.
 * Each row is clickable → opens Solana Explorer (when there's a sig)
 * or the agent page. New rows slide in from the top with a 200ms fade.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  signature: string | null;
  amountUsd: number | null;
  counterparty: string | null;
  description: string;
  metadata: { agentId?: string; agentName?: string } | null;
}

function timeOnly(ts: string): string {
  const d = new Date(ts.replace(" ", "T") + (ts.includes("Z") ? "" : "Z"));
  if (isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  // Date prefix only when not today — avoids the "10:58 above 19:48" confusion
  const now = new Date();
  const sameDay =
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate();
  if (sameDay) return `${hh}:${mm}:${ss}`;
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${d.getUTCDate()} ${hh}:${mm}`;
}

function verb(e: LogEntry): { text: string; color: string } {
  switch (e.eventType) {
    case "earning_received":
      return { text: `earned $${(e.amountUsd ?? 0).toFixed(3)}`, color: "#4ADE80" };
    case "spending_sent":
      return { text: `spent $${(e.amountUsd ?? 0).toFixed(3)}`, color: "#F59E0B" };
    case "attack_blocked":
      return { text: `BLOCKED`, color: "#F87171" };
    case "ability_installed":
      return { text: e.description.slice(0, 36), color: "rgba(255,255,255,0.7)" };
    default:
      return { text: e.description.slice(0, 36), color: "rgba(255,255,255,0.6)" };
  }
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

function workerName(e: LogEntry): string {
  return e.metadata?.agentName || "device";
}

export function ActivityFeed({ deviceId }: { deviceId: string }) {
  const [rows, setRows] = useState<LogEntry[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/devices/${deviceId}/log?limit=10`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.log) setRows(d.log as LogEntry[]);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 4_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [deviceId]);

  // Defensive client-side sort by parsed timestamp (newest first)
  const top = [...rows]
    .sort((a, b) => {
      const ta = Date.parse(a.timestamp.replace(" ", "T") + "Z");
      const tb = Date.parse(b.timestamp.replace(" ", "T") + "Z");
      return tb - ta;
    })
    .slice(0, 5);

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: "rgba(8,11,20,0.6)",
        border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="px-4 py-2 text-[10px] font-mono uppercase flex items-center justify-between"
        style={{
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.12em",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span>Activity</span>
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#4ADE80" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <AnimatePresence initial={false}>
          {top.length === 0 && (
            <div
              className="px-4 py-3 text-[12px] font-mono"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              waiting for first event…
            </div>
          )}
          {top.map((e) => {
            const v = verb(e);
            const ExplorerHref = e.signature
              ? `https://explorer.solana.com/tx/${e.signature}?cluster=devnet`
              : e.metadata?.agentId
                ? `/app/agents/${e.metadata.agentId}`
                : null;
            const InnerComponent = ExplorerHref ? "a" : "div";
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <InnerComponent
                  {...(ExplorerHref ? { href: ExplorerHref, target: "_blank", rel: "noreferrer" } : {})}
                  className="flex items-center gap-2 px-4 py-2.5 font-mono text-[12px] hover:bg-white/[0.02] transition"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>
                    {timeOnly(e.timestamp)}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span style={{ color: "rgba(255,255,255,0.85)" }}>
                    {workerName(e)}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span style={{ color: v.color }}>{v.text}</span>
                  {e.signature && (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>
                        {shortSig(e.signature)} ↗
                      </span>
                    </>
                  )}
                </InnerComponent>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
