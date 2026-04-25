"use client";

/**
 * LogEntry — single row in any activity feed.
 * Icon + description + amount + counterparty + signature + timestamp.
 */

import { motion } from "framer-motion";
import { SignaturePill } from "./signature-pill";
import { fmtAgo } from "@/lib/format";

interface LogEntryProps {
  eventType: string;
  description: string;
  signature?: string | null;
  amountUsd?: number | null;
  counterparty?: string | null;
  timestamp: string;
  deviceName?: string | null;
  deviceEmoji?: string | null;
  isNew?: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  earning_received: "#00A86B",
  spending_sent: "#0052FF",
  attack_blocked: "#D92D20",
  ability_installed: "#9B9B9B",
  bounty_enabled: "#D92D20",
  device_created: "#0052FF",
};

export function LogEntry({
  eventType,
  description,
  signature,
  amountUsd,
  counterparty,
  timestamp,
  deviceName,
  deviceEmoji,
  isNew,
}: LogEntryProps) {
  const dotColor = EVENT_COLORS[eventType] ?? "#9B9B9B";
  const isEarning = eventType === "earning_received";
  const isAttack = eventType === "attack_blocked";

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -8, backgroundColor: "rgba(0,168,107,0.04)" } : false}
      animate={{ opacity: 1, y: 0, backgroundColor: "transparent" }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      {/* Event dot */}
      <span
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: dotColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {deviceEmoji && (
            <span className="text-[12px] shrink-0">{deviceEmoji}</span>
          )}
          <span className="text-[13px] text-[#0A0A0A] truncate">
            {description}
          </span>
        </div>
        {(counterparty || deviceName) && (
          <span className="text-[10px] text-[#9B9B9B]">
            {deviceName ? `${deviceName} · ` : ""}{counterparty}
          </span>
        )}
      </div>

      {/* Amount */}
      {amountUsd != null && amountUsd > 0 && (
        <span
          className="text-[12px] font-mono font-semibold shrink-0"
          style={{
            color: isEarning ? "#00A86B" : isAttack ? "#D92D20" : "#0A0A0A",
          }}
        >
          {isEarning ? "+" : isAttack ? "−" : ""}${amountUsd.toFixed(3)}
        </span>
      )}

      {/* Signature */}
      {signature && (
        <div className="shrink-0">
          <SignaturePill signature={signature} />
        </div>
      )}

      {/* Timestamp */}
      <span className="text-[10px] text-[#9B9B9B] shrink-0 w-[48px] text-right">
        {fmtAgo(timestamp)}
      </span>
    </motion.div>
  );
}
