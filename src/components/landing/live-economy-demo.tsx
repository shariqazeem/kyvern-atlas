"use client";

/**
 * LiveEconomyDemo — auto-cycling preview of the device home (/app).
 *
 * Light-register card showing the EarningsHero pattern + a 4-row
 * ActionFeed-style log. Every ~6s a new action lands at the top with
 * the earnings counter ticking up by the corresponding amount.
 *
 * The action templates mirror the trio's actual production output —
 * not invented copy, just the same verbs the live runner produces.
 *
 * No data fetched here; it's a deterministic visual loop. The real
 * /app surface is one click away via the CTA.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Check, Link2, ExternalLink, ArrowUpRight } from "lucide-react";
import { WorkerEmoji } from "@/components/icons/worker-emoji";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface DemoAction {
  id: number;
  emoji: string;
  worker: "Sentinel" | "Wren" | "Pulse";
  verb: string;
  amount: number;
  /** "+" earned (green) or "-" spent (amber) */
  tone: "earned" | "spent";
  /** Synthetic 8-char sig prefix for the Explorer pill */
  sigPrefix: string;
}

const ACTION_TEMPLATES: Omit<DemoAction, "id" | "sigPrefix">[] = [
  { emoji: "🎯", worker: "Sentinel", verb: "drafted application · queued for review", amount: 0.15, tone: "spent" },
  { emoji: "🐋", worker: "Wren", verb: "validated a finding for the team", amount: 0.15, tone: "earned" },
  { emoji: "🐋", worker: "Wren", verb: "delivered work — earned", amount: 0.15, tone: "earned" },
  { emoji: "📈", worker: "Pulse", verb: "paid Pay.sh / Gemini · backed a finding", amount: 0.02, tone: "spent" },
  { emoji: "🎯", worker: "Sentinel", verb: "surfaced $10k bounty", amount: 0.0, tone: "earned" },
  { emoji: "📈", worker: "Pulse", verb: "validated · SOL @ $145.21", amount: 0.10, tone: "earned" },
];

/** Synthetic but base58-shaped sig prefix so the Explorer pill renders
 *  exactly like the real /app version. */
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function fakeSig(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

// Deterministic placeholders for the very first paint so server-rendered
// HTML matches the client hydration. The useEffect below replaces them
// with random sig prefixes after mount.
const SEED_SIGS = ["5xK3Bn2P", "Tq9aR4mZ", "Jh7PvX1L", "4kNs8WpC"];

export function LiveEconomyDemo() {
  // Start with 4 seeded actions so the feed is never empty on first paint.
  // Seeds are deterministic to avoid SSR/CSR hydration mismatch; we
  // randomize them in the useEffect below.
  const [actions, setActions] = useState<DemoAction[]>(() => {
    const seeded: DemoAction[] = [];
    for (let i = 0; i < 4; i++) {
      const tpl = ACTION_TEMPLATES[i % ACTION_TEMPLATES.length];
      seeded.push({ ...tpl, id: -i, sigPrefix: SEED_SIGS[i] });
    }
    return seeded;
  });
  const [earnedToday, setEarnedToday] = useState(0.45);
  const [tickIdx, setTickIdx] = useState(4);

  useEffect(() => {
    const iv = setInterval(() => {
      setTickIdx((i) => i + 1);
      setActions((prev) => {
        const tpl = ACTION_TEMPLATES[tickIdx % ACTION_TEMPLATES.length];
        const next: DemoAction = {
          ...tpl,
          id: Date.now(),
          sigPrefix: fakeSig(),
        };
        return [next, ...prev].slice(0, 5);
      });
      // Bump earnings only on completed/validated actions
      const tpl = ACTION_TEMPLATES[tickIdx % ACTION_TEMPLATES.length];
      if (tpl.tone === "earned" && tpl.amount > 0 && tpl.verb.includes("completed")) {
        setEarnedToday((e) => e + tpl.amount);
      }
    }, 6_000);
    return () => clearInterval(iv);
  }, [tickIdx]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative w-full max-w-[480px] mx-auto"
    >
      {/* Phase 9 (2026-05-08) — light premium chassis. The previous
          dark navy frame on a #FAFAFA section read as a heavy black
          slab; this version uses a soft white shell with a quiet
          inset rim + a green accent halo so the preview floats
          rather than landing like a brick. */}
      <div
        className="rounded-[28px] p-3 sm:p-4"
        style={{
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "inset 0 -1px 0 rgba(15,23,42,0.04)",
            "0 0 0 1px rgba(34,197,94,0.06)",
            "0 18px 38px -16px rgba(15,23,42,0.10)",
            "0 38px 72px -28px rgba(15,23,42,0.08)",
          ].join(", "),
        }}
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-2.5">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#22C55E",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.18), 0 0 8px #22C55E",
              }}
            />
            <span
              className="font-mono uppercase"
              style={{
                color: "rgba(15,23,42,0.55)",
                fontSize: 9.5,
                letterSpacing: "0.16em",
              }}
            >
              Your Kyvern · live preview
            </span>
          </div>
          <span
            className="font-mono"
            style={{ color: "rgba(15,23,42,0.40)", fontSize: 9.5 }}
          >
            /app
          </span>
        </div>

        <div
          className="rounded-[20px] overflow-hidden"
          style={{ background: "#FAFAFA" }}
        >
          {/* EarningsHero mock */}
          <div
            className="relative px-5 pt-5 pb-4"
            style={{
              background: "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 70%)",
              borderBottom: "1px solid rgba(15,23,42,0.05)",
            }}
          >
            <p
              className="font-mono uppercase tracking-[0.14em] mb-1.5"
              style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
            >
              Your device earned today
            </p>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={Math.floor(earnedToday * 100)}
                initial={{ scale: 0.95, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="font-mono tracking-[-0.02em] font-light text-[#0A0A0A]"
                style={{
                  fontSize: "clamp(36px, 5.4vw, 52px)",
                  lineHeight: 1.0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${earnedToday.toFixed(2)}
              </motion.span>
              <span
                className="text-[12px] font-mono inline-flex items-center"
                style={{ color: "#15803D" }}
              >
                <ArrowUpRight className="w-3 h-3" strokeWidth={2.4} />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Pill tone="green">
                +${(0.02 + (tickIdx % 4) * 0.005).toFixed(3)}/min
              </Pill>
              <Pill>
                spent <span style={{ color: "#B45309", fontWeight: 600 }}>$0.32</span>
              </Pill>
              <Pill tone="green">
                net +${(earnedToday - 0.32).toFixed(2)}
              </Pill>
            </div>
          </div>

          {/* ActionFeed mock */}
          <div className="bg-white">
            <div
              className="flex items-center justify-between px-4 pt-3 pb-2"
              style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
            >
              <div className="flex items-center gap-1.5">
                <Activity
                  className="w-3 h-3"
                  strokeWidth={2.2}
                  style={{ color: "#15803D" }}
                />
                <span
                  className="font-mono uppercase tracking-[0.14em]"
                  style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
                >
                  Live action feed
                </span>
                <motion.span
                  className="rounded-full ml-0.5"
                  style={{
                    width: 5,
                    height: 5,
                    background: "#22C55E",
                    boxShadow: "0 0 0 2.5px rgba(34,197,94,0.14)",
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
              </div>
              <span
                className="font-mono"
                style={{ color: "#9CA3AF", fontSize: 10 }}
              >
                {actions.length} events
              </span>
            </div>
            <ul
              className="divide-y"
              style={{ borderColor: "rgba(15,23,42,0.04)" }}
            >
              <AnimatePresence initial={false}>
                {actions.map((a) => (
                  <DemoFeedRow key={a.id} a={a} />
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DemoFeedRow({ a }: { a: DemoAction }) {
  const showAmount = a.amount > 0;
  const amountColor = a.tone === "earned" ? "#15803D" : "#B45309";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="px-4 py-2.5 flex items-center gap-2 flex-nowrap min-w-0"
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center flex-none"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
          color: "#374151",
        }}
      >
        <WorkerEmoji emoji={a.emoji} size={11} strokeWidth={2} />
      </span>
      <span
        className="text-[12.5px] font-medium flex-none"
        style={{ color: "#0A0A0A" }}
      >
        {a.worker}
      </span>
      <span
        className="text-[12.5px] min-w-0 flex-1 truncate"
        style={{ color: "#374151", lineHeight: 1.4 }}
      >
        {a.verb}
        {showAmount && (
          <>
            {" "}
            <span
              className="font-mono font-semibold"
              style={{
                color: amountColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {a.tone === "earned" ? "+" : ""}${a.amount.toFixed(3)}
            </span>
          </>
        )}
      </span>
      <Check
        className="w-3 h-3 flex-none"
        strokeWidth={2.6}
        style={{ color: "#15803D" }}
      />
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono flex-none"
        style={{
          background: "rgba(34,197,94,0.10)",
          color: "#15803D",
          fontSize: 10.5,
        }}
      >
        <Link2 className="w-2.5 h-2.5" strokeWidth={2.4} />
        <span className="hidden sm:inline">
          {a.sigPrefix.slice(0, 4)}…{a.sigPrefix.slice(-4)}
        </span>
        <ExternalLink className="w-2.5 h-2.5" />
      </span>
    </motion.li>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "green" | "red";
}) {
  const color =
    tone === "green" ? "#15803D" : tone === "red" ? "#B91C1C" : "#374151";
  const bg =
    tone === "green"
      ? "rgba(34,197,94,0.10)"
      : tone === "red"
        ? "rgba(239,68,68,0.10)"
        : "rgba(15,23,42,0.04)";
  return (
    <span
      className="font-mono text-[11px] inline-flex items-center px-2 py-0.5 rounded-full"
      style={{
        background: bg,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </span>
  );
}
