"use client";

/**
 * FirstMessage — single chat-bubble that types itself out at ~30ch/sec
 * the first time it renders. The text is hand-written server-side,
 * persisted to agents.metadata_json.firstMessage at spawn, and surfaced
 * here as a one-way introduction (no reply input).
 *
 * After typing, the bubble sits as a quiet anchor for the rest of the
 * boot sequence and persists in steady state too.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const CHARS_PER_SECOND = 30;
const TICK_MS = 1000 / CHARS_PER_SECOND;

interface FirstMessageProps {
  emoji: string;
  message: string;
  /** When true, skip the typewriter and render the full message —
   *  used in steady-state (after first thought lands and the page
   *  re-mounts on refresh). */
  instant?: boolean;
}

export function FirstMessage({ emoji, message, instant }: FirstMessageProps) {
  const [shown, setShown] = useState(() => (instant ? message : ""));
  const haveTypedRef = useRef(instant);

  useEffect(() => {
    if (haveTypedRef.current) {
      setShown(message);
      return;
    }
    if (!message) return;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setShown(message.slice(0, i));
      if (i >= message.length) {
        clearInterval(iv);
        haveTypedRef.current = true;
      }
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [message]);

  const isTyping = shown.length < message.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="rounded-[16px] mb-4 overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[20px] shrink-0"
          style={{
            background: "linear-gradient(180deg, #F2F3F5 0%, #FFFFFF 100%)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow:
              "inset 0 1px 2px rgba(15,23,42,0.06), inset 0 -1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-mono text-[9.5px] uppercase tracking-[0.16em] mb-1"
            style={{ color: "#9CA3AF" }}
          >
            Worker → you
          </div>
          <p
            className="text-[14.5px] leading-[1.55]"
            style={{ color: "#0A0A0A" }}
          >
            {shown}
            {isTyping && (
              <motion.span
                className="inline-block ml-[1px]"
                style={{
                  width: 7,
                  height: 14,
                  background: "#0A0A0A",
                  verticalAlign: "-2px",
                  borderRadius: 1,
                }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
              />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
