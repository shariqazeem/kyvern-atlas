"use client";

/**
 * BootSequence — replaces the old activation banner.
 *
 * Vertical stack of seven status lines that unfold over ~45s while the
 * worker spins up. Each line slides in 4-7s after the prior one,
 * pulses while active, becomes solid green when superseded, and fades
 * to 0.4 opacity once a newer line lands.
 *
 * The whole stack dissolves the moment a thought lands — that's the
 * dissolveSignal prop, fired by the page when totalThoughts goes 0→1.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Beat {
  stepIndex: number;
  message: string;
  createdAt: number;
}

interface BootSequenceProps {
  agentId: string;
  /** When true, the page has detected first signal — dissolve the
   *  stack with a graceful exit. */
  dissolveSignal: boolean;
  /** Spawn time, used for absolute timestamps shown next to each beat. */
  spawnedAt: number;
}

function formatOffset(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60).toString().padStart(2, "0");
  const ss = (total % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function BootSequence({
  agentId,
  dissolveSignal,
  spawnedAt,
}: BootSequenceProps) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [hidden, setHidden] = useState(false);

  // Poll every 2s for newly-revealed beats. Server returns boot rows
  // whose created_at <= now, so the count grows from 1→7 over ~45s.
  useEffect(() => {
    let cancelled = false;
    const fetchBeats = async () => {
      try {
        const r = await fetch(`/api/agents/${agentId}/status-stream`);
        if (!r.ok) return;
        const data = (await r.json()) as { boot: Beat[]; phase: string };
        if (!cancelled && Array.isArray(data.boot)) {
          setBeats(data.boot);
        }
      } catch {
        /* ignore */
      }
    };
    void fetchBeats();
    const iv = setInterval(fetchBeats, 2000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [agentId]);

  // Soft dissolve once the page tells us the first thought landed.
  useEffect(() => {
    if (!dissolveSignal) return;
    const t = setTimeout(() => setHidden(true), 600);
    return () => clearTimeout(t);
  }, [dissolveSignal]);

  if (hidden) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: dissolveSignal ? 0 : 1,
        y: dissolveSignal ? -8 : 0,
      }}
      transition={{ duration: 0.45, ease: EASE }}
      className="rounded-[16px] mb-4 overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2.5"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-1.5">
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#22C55E",
              boxShadow: "0 0 0 3px rgba(34,197,94,0.12)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase"
            style={{
              color: "#15803D",
              fontSize: 9.5,
              letterSpacing: "0.16em",
            }}
          >
            First sweep
          </span>
        </div>
        <span
          className="font-mono"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          {beats.length}/7
        </span>
      </div>

      <div className="px-4 py-3">
        <AnimatePresence initial={false}>
          {beats.map((beat, i) => {
            const isLatest = i === beats.length - 1;
            const offsetMs = beat.createdAt - spawnedAt;
            return (
              <motion.div
                key={beat.stepIndex}
                layout
                initial={{ opacity: 0, x: -6, height: 0 }}
                animate={{
                  opacity: isLatest ? 1 : 0.42,
                  x: 0,
                  height: "auto",
                }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex items-center gap-3 py-1.5"
              >
                <span
                  className="font-mono shrink-0"
                  style={{
                    color: "#9CA3AF",
                    fontSize: 10,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatOffset(offsetMs)}
                </span>
                <motion.span
                  className="rounded-full shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background: isLatest ? "#22C55E" : "#15803D",
                    boxShadow: isLatest
                      ? "0 0 0 3px rgba(34,197,94,0.14), 0 0 6px rgba(34,197,94,0.45)"
                      : "0 0 0 2px rgba(34,197,94,0.10)",
                  }}
                  animate={isLatest ? { scale: [1, 1.18, 1] } : {}}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                />
                <span
                  className="font-mono"
                  style={{
                    fontSize: 13,
                    color: "#0A0A0A",
                    letterSpacing: "0.005em",
                  }}
                >
                  {beat.message}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Placeholder slots for the remaining beats — visual hint
            that more is coming, in dim mono dots. */}
        {Array.from({ length: Math.max(0, 7 - beats.length) }).map((_, i) => (
          <motion.div
            key={`pending_${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            className="flex items-center gap-3 py-1.5"
          >
            <span
              className="font-mono shrink-0"
              style={{ fontSize: 10, color: "#D1D5DB" }}
            >
              ··:··
            </span>
            <span
              className="rounded-full shrink-0"
              style={{
                width: 6,
                height: 6,
                background: "#E5E7EB",
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 13, color: "#D1D5DB" }}
            >
              ───
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
