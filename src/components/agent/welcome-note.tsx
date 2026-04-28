"use client";

/**
 * WelcomeNote — single mono line at the top of the agent detail page.
 *
 *   Sentinel · KVN-LZJSXSSN · hired 14s ago by you
 *
 * Reframes the surface: this isn't an "agent detail page", it's the
 * worker you hired. Hire-time-ago ticks live. After the first thought
 * lands, the line gracefully shifts to "hired 47s ago · alive".
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface WelcomeNoteProps {
  name: string;
  serial: string;
  hiredAt: number;
  alive: boolean;
}

function fmtAgo(ms: number): string {
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function WelcomeNote({ name, serial, hiredAt, alive }: WelcomeNoteProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const ago = fmtAgo(now - hiredAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="font-mono text-[11.5px] tracking-[0.04em] mb-3"
      style={{ color: "#6B7280" }}
    >
      <span style={{ color: "#0A0A0A", fontWeight: 500 }}>{name}</span>
      <span style={{ color: "#D1D5DB" }}> · </span>
      <span>{serial}</span>
      <span style={{ color: "#D1D5DB" }}> · </span>
      <span>
        hired {ago}
        {alive ? (
          <>
            <span style={{ color: "#D1D5DB" }}> · </span>
            <span style={{ color: "#15803D", fontWeight: 500 }}>alive</span>
          </>
        ) : (
          <>
            {" by "}
            <span style={{ color: "#0A0A0A", fontWeight: 500 }}>you</span>
          </>
        )}
      </span>
    </motion.div>
  );
}
