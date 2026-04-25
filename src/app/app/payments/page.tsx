"use client";

/**
 * /app/payments — Activity Tab.
 *
 * Two views: My Device (your device's events) and Global (the firehose).
 * Every row uses LogEntry with SignaturePill → Explorer.
 * The firehose makes the network feel alive.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { LogEntry } from "@/components/primitives/log-entry";
import { StatBlock } from "@/components/primitives/stat-block";

type View = "device" | "global";

interface GlobalEvent {
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

interface DeviceLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  description: string;
  signature: string | null;
  amountUsd: number | null;
  counterparty: string | null;
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export default function ActivityPage() {
  const [view, setView] = useState<View>("global");
  const { wallet, isLoading } = useAuth();
  const { vaultId, autoInit } = useDeviceStore();

  // Auto-init device store
  useEffect(() => {
    if (isLoading || vaultId) return;
    const w = wallet ?? devWallet();
    if (w) void autoInit(w);
  }, [isLoading, wallet, autoInit, vaultId]);

  // Global firehose
  const [globalEvents, setGlobalEvents] = useState<GlobalEvent[]>([]);
  const [economy, setEconomy] = useState({
    totalDevices: 0,
    totalEarned: 0,
    totalAttacksBlocked: 0,
    totalVolume: 0,
  });

  // Device log
  const [deviceLog, setDeviceLog] = useState<DeviceLogEntry[]>([]);

  // Poll global firehose
  useEffect(() => {
    const load = () => {
      fetch("/api/log/global?limit=50")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.events) setGlobalEvents(d.events as GlobalEvent[]);
          if (d?.economy) setEconomy(d.economy);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 6000);
    return () => clearInterval(iv);
  }, []);

  // Poll device log
  useEffect(() => {
    if (!vaultId) return;
    const load = () => {
      fetch(`/api/devices/${vaultId}/log?limit=30`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.log) setDeviceLog(d.log as DeviceLogEntry[]);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 6000);
    return () => clearInterval(iv);
  }, [vaultId]);

  const events = view === "global" ? globalEvents : deviceLog;

  return (
    <div className="py-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#0A0A0A] mb-4">
          Activity
        </h1>

        {/* Economy stats strip */}
        <div
          className="rounded-[20px] p-4 flex items-center justify-around mb-4"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <StatBlock value={String(economy.totalDevices)} label="Devices" size="sm" />
          <StatBlock
            value={`$${economy.totalEarned.toFixed(2)}`}
            label="Earned"
            color="#00A86B"
            size="sm"
          />
          <StatBlock
            value={String(economy.totalAttacksBlocked)}
            label="Blocked"
            color="#D92D20"
            size="sm"
          />
          <StatBlock
            value={`$${economy.totalVolume.toFixed(2)}`}
            label="Volume"
            size="sm"
          />
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("device")}
            className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors"
            style={{
              background: view === "device" ? "#0A0A0A" : "transparent",
              color: view === "device" ? "#fff" : "#9B9B9B",
            }}
          >
            My Device
          </button>
          <button
            onClick={() => setView("global")}
            className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors"
            style={{
              background: view === "global" ? "#0A0A0A" : "transparent",
              color: view === "global" ? "#fff" : "#9B9B9B",
            }}
          >
            Global
          </button>
        </div>
      </motion.div>

      {/* Events feed */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        {events.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[14px] text-[#9B9B9B]">
              {view === "device"
                ? "No activity yet. Install an ability to get started."
                : "Loading network activity..."}
            </p>
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={event.id}
              style={i > 0 ? { borderTop: "1px solid #F5F5F5" } : {}}
            >
              <LogEntry
                eventType={event.eventType}
                description={event.description}
                signature={event.signature}
                amountUsd={event.amountUsd}
                counterparty={event.counterparty}
                timestamp={event.timestamp}
                deviceName={view === "global" ? (event as GlobalEvent).deviceName : undefined}
                deviceEmoji={view === "global" ? (event as GlobalEvent).deviceEmoji : undefined}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
