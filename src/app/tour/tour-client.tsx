"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * TourClient — the 30-second autoplay.
 *
 * Six scenes, ~5 seconds each. Each scene is a full-viewport card
 * with:
 *   · A background visual (the real component when possible — Atlas
 *     observatory, terminal receipt, etc. — so the tour doesn't feel
 *     like a slideshow)
 *   · A captioning strip at the top-center ("Chapter 2 of 6") so the
 *     viewer always knows where they are
 *   · A one-sentence narrative beneath
 *   · A progress rail at the very bottom
 *
 * Controls:
 *   · Autoplay starts immediately on mount
 *   · Space bar toggles play/pause
 *   · ← / → step scenes
 *   · Escape returns to /
 *
 * We deliberately DON'T show the standard navbar here — this is a
 * cinematic. Letting the viewer's chrome peek in would break the
 * "product film" feeling. A tiny "exit tour" pill sits top-right.
 * ════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { EASE_PREMIUM as EASE, EASE_SPRING as SPRING } from "@/lib/motion";
import { LiveTimer } from "@/components/atlas/live-timer";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { fmtInt, fmtUsd } from "@/lib/format";

/** Scene duration in ms. 5 × 6 = 30s for the full tour. */
const SCENE_MS = 5_000;

// The public AtlasState shape as the tour needs it. We accept null
// (local dev / cold DB) and render placeholders.
interface AtlasStateLite {
  firstIgnitionAt: string | null;
  totalSettled: number;
  totalSpentUsd: number;
  totalAttacksBlocked: number;
  totalBlocked: number;
  fundsLostUsd: number;
  lastDecision:
    | {
        reasoning: string;
        merchant: string | null;
        action: string;
        outcome: string;
        txSignature: string | null;
      }
    | null;
  lastAttack:
    | {
        description: string;
        blockedReason: string;
        type: string;
      }
    | null;
  policy?: {
    dailyCapUsd: number;
    spentTodayUsd: number;
  };
}

export function TourClient({
  initialState,
}: {
  initialState: AtlasStateLite | null;
}) {
  const scenes = useMemo(() => makeScenes(initialState), [initialState]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const startRef = useRef<number>(Date.now());
  const [, setNow] = useState(0);

  const next = useCallback(() => {
    setIdx((i) => {
      if (i >= scenes.length - 1) {
        // Clamp at the finale scene — the CTA is the endpoint.
        return scenes.length - 1;
      }
      return i + 1;
    });
    startRef.current = Date.now();
  }, [scenes.length]);

  const prev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
    startRef.current = Date.now();
  }, []);

  const toggle = useCallback(() => {
    setPlaying((p) => !p);
    startRef.current = Date.now();
  }, []);

  // Keyboard shortcuts — space / arrows / escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowRight") {
        next();
      } else if (e.code === "ArrowLeft") {
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, prev]);

  // Auto-advance loop + progress tick. We run a single 100ms interval
  // that both triggers the next scene when elapsed exceeds SCENE_MS
  // AND drives the progress-rail re-render.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - startRef.current >= SCENE_MS) {
        if (idx >= scenes.length - 1) {
          // Finale — stop, leave the CTA on screen.
          setPlaying(false);
          return;
        }
        setIdx((i) => Math.min(scenes.length - 1, i + 1));
        startRef.current = Date.now();
      }
    }, 100);
    return () => clearInterval(id);
  }, [playing, idx, scenes.length]);

  // Reset the scene clock whenever idx changes (user pressed next/prev).
  useEffect(() => {
    startRef.current = Date.now();
  }, [idx]);

  const scene = scenes[idx];
  const progress = Math.min(
    1,
    (Date.now() - startRef.current) / SCENE_MS,
  );

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Ambient dot grid — present throughout every scene so transitions
          don't flash to white. Mask to center so the edges breathe. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-40"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 40%, black 40%, transparent 100%)",
        }}
      />

      {/* Top-right exit pill — minimal chrome, one way out. */}
      <Link
        href="/"
        className="fixed top-5 right-5 z-20 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-semibold transition-colors"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <X className="w-3.5 h-3.5" />
        exit tour
      </Link>

      {/* Chapter indicator — top-center */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-20">
        <div
          className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[11px] font-mono-numbers"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--agent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          Chapter {idx + 1} of {scenes.length} · {scene.title}
        </div>
      </div>

      {/* Scene stage — full viewport, vertical center.
          Each scene's visual + narration fade in together. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.key}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.8, ease: SPRING }}
            className="flex flex-col items-center w-full max-w-5xl"
          >
            {/* Scene visual (tall, dominant) */}
            <div className="w-full mb-10">{scene.visual}</div>

            {/* Narration — the sentence that carries the meaning */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
              className="text-center text-balance mx-auto max-w-[680px]"
              style={{
                fontSize: "clamp(22px, 3.2vw, 34px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {scene.narration}
            </motion.p>

            {/* Optional CTA — only on the finale scene */}
            {scene.cta && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
                className="mt-8 flex items-center gap-3"
              >
                <Link href="/vault/new" className="btn-primary group">
                  Deploy your first agent
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 h-[52px] px-6 rounded-[18px] text-[15px] font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Back to the landing page
                </Link>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls + progress — fixed bottom */}
      <div className="fixed bottom-0 inset-x-0 z-20">
        {/* Progress rail — 6 pips, the active one fills over SCENE_MS */}
        <div className="mx-auto max-w-5xl px-6 pb-3 pt-2">
          <div className="flex items-center gap-1.5">
            {scenes.map((s, i) => (
              <div
                key={s.key}
                className="flex-1 h-[2px] rounded-full overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    background:
                      i < idx
                        ? "var(--text-primary)"
                        : i === idx
                          ? "var(--agent)"
                          : "transparent",
                    width:
                      i < idx
                        ? "100%"
                        : i === idx
                          ? `${Math.round(progress * 100)}%`
                          : "0%",
                    transition: "width 120ms linear",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Transport row */}
        <div
          className="px-6 py-3 flex items-center justify-between gap-4"
          style={{
            background: "var(--surface)",
            borderTop: "0.5px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-[11px] font-mono-numbers"
            style={{ color: "var(--text-quaternary)" }}
          >
            kyvernlabs.com/tour · 30s
          </div>
          <div className="flex items-center gap-2">
            <TransportButton onClick={prev} aria-label="Previous scene" disabled={idx === 0}>
              <SkipBack className="w-3.5 h-3.5" />
            </TransportButton>
            <TransportButton
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              accent
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </TransportButton>
            <TransportButton
              onClick={next}
              aria-label="Next scene"
              disabled={idx >= scenes.length - 1}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </TransportButton>
          </div>
          <div
            className="text-[11px] font-mono-numbers"
            style={{ color: "var(--text-quaternary)" }}
          >
            space · pause / play &nbsp; ← → · scenes
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Scene factory — each scene is a small render spec. Data is baked
   from the initial Atlas state so every visual is REAL, not mocked.
   ──────────────────────────────────────────────────────────────── */

interface Scene {
  key: string;
  title: string;
  narration: React.ReactNode;
  visual: React.ReactNode;
  cta?: boolean;
}

function makeScenes(s: AtlasStateLite | null): Scene[] {
  const hasState = !!s?.firstIgnitionAt;

  return [
    {
      key: "intro",
      title: "Cold open",
      narration: (
        <>
          A new kind of software has arrived —{" "}
          <span style={{ fontWeight: 700 }}>AI agents that move money.</span>
        </>
      ),
      visual: <IntroVisual />,
    },
    {
      key: "atlas-live",
      title: "Atlas · live",
      narration: (
        <>
          Meet Atlas — our reference agent. Running autonomously on Solana
          devnet right now.
        </>
      ),
      visual: <AtlasVisual state={s} />,
    },
    {
      key: "decision",
      title: "Autonomy",
      narration:
        s?.lastDecision?.reasoning
          ? `Every two minutes it makes a decision. The last one: “${s.lastDecision.reasoning}”`
          : "Every two minutes it makes a decision, in its own words.",
      visual: <DecisionVisual state={s} />,
    },
    {
      key: "attack",
      title: "Adversarial pressure",
      narration:
        "Every twenty minutes, an adversary probes it — prompt injection, rogue merchants, over-cap drains.",
      visual: <AttackVisual state={s} />,
    },
    {
      key: "refusal",
      title: "On-chain refusal",
      narration: (
        <>
          Kyvern refuses — <span style={{ fontWeight: 700 }}>on Solana itself.</span>{" "}
          No off-chain trust. No funds move.
        </>
      ),
      visual: <TerminalVisual />,
    },
    {
      key: "cta",
      title: "Your turn",
      narration: (
        <>
          In sixty seconds, your agent is next.{" "}
          {hasState ? (
            <>
              Join a network that&rsquo;s already survived{" "}
              <span style={{ fontWeight: 700 }}>
                {fmtInt(s.totalAttacksBlocked + s.totalBlocked)}
              </span>{" "}
              attacks — and lost{" "}
              <span style={{ fontWeight: 700 }}>{fmtUsd(s.fundsLostUsd)}</span>.
            </>
          ) : (
            <>Deploy on devnet, watch it run free.</>
          )}
        </>
      ),
      visual: <CtaVisual state={s} />,
      cta: true,
    },
  ];
}

/* ────────────────────────────────────────────────────────────────
   Scene visuals
   ──────────────────────────────────────────────────────────────── */

function IntroVisual() {
  return (
    <motion.div
      className="w-full flex items-center justify-center"
      style={{ minHeight: "200px" }}
    >
      <motion.div
        className="rounded-full"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1, 0.98], opacity: [0, 1, 1] }}
        transition={{ duration: 2, ease: SPRING }}
        style={{
          width: "220px",
          height: "220px",
          background: "var(--agent-bg)",
          border: "0.5px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.03), 0 30px 80px -40px rgba(79,70,229,0.22)",
        }}
      >
        <motion.div
          className="w-[140px] h-[140px] rounded-full"
          style={{ background: "var(--agent)" }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

function AtlasVisual({ state }: { state: AtlasStateLite | null }) {
  return (
    <div
      className="mx-auto w-full max-w-[640px] rounded-[18px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.12)",
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-red)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-yellow)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-green)" }}
          />
        </div>
        <span
          className="text-[10.5px] font-mono-numbers"
          style={{ color: "var(--text-quaternary)" }}
        >
          kyvernlabs.com/atlas
        </span>
        <div className="flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--success)" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--success-deep)" }}
          >
            live
          </span>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-5">
        <TourStat
          label="Uptime"
          value={
            state?.firstIgnitionAt ? (
              <LiveTimer since={state.firstIgnitionAt} />
            ) : (
              "just now"
            )
          }
        />
        <TourStat
          label="Transactions"
          value={<NumberScramble value={state?.totalSettled ?? 0} format={fmtInt} />}
        />
        <TourStat
          label="Attacks blocked"
          value={
            <NumberScramble
              value={
                (state?.totalAttacksBlocked ?? 0) + (state?.totalBlocked ?? 0)
              }
              format={fmtInt}
            />
          }
          tone="attack"
        />
      </div>
    </div>
  );
}

function TourStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "attack" | "success";
}) {
  const color =
    tone === "attack"
      ? "var(--attack)"
      : tone === "success"
        ? "var(--success-deep)"
        : "var(--text-primary)";
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[24px] md:text-[28px] font-mono-numbers tabular-nums tracking-tight leading-none"
        style={{ color, fontWeight: 500 }}
      >
        {value}
      </p>
    </div>
  );
}

function DecisionVisual({ state }: { state: AtlasStateLite | null }) {
  const d = state?.lastDecision;
  return (
    <div
      className="mx-auto max-w-[640px] rounded-[18px] p-6 md:p-7"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--agent)" }}
        >
          Last decision
        </span>
      </div>
      <p
        className="text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.015em]"
        style={{
          color: "var(--text-primary)",
          fontStyle: d ? "italic" : "normal",
          fontWeight: 500,
        }}
      >
        {d?.reasoning
          ? `“${d.reasoning}”`
          : "Atlas is thinking about its next move…"}
      </p>
      {d && (
        <div
          className="mt-4 flex flex-wrap items-center gap-x-3 text-[11.5px] font-mono-numbers"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>{d.action}</span>
          {d.merchant && (
            <>
              <span style={{ color: "var(--text-quaternary)" }}>→</span>
              <span>{d.merchant}</span>
            </>
          )}
          <span style={{ color: "var(--text-quaternary)" }}>·</span>
          <span
            style={{
              color:
                d.outcome === "settled"
                  ? "var(--success-deep)"
                  : d.outcome === "blocked"
                    ? "var(--attack)"
                    : "var(--text-tertiary)",
              fontWeight: 600,
            }}
          >
            {d.outcome}
          </span>
        </div>
      )}
    </div>
  );
}

function AttackVisual({ state }: { state: AtlasStateLite | null }) {
  const a = state?.lastAttack;
  return (
    <div
      className="mx-auto max-w-[640px] rounded-[18px] p-6 md:p-7"
      style={{
        background: "var(--attack-bg)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(185,28,28,0.18)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--attack)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--attack)" }}
        >
          Incoming probe
        </span>
      </div>
      <p
        className="text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.015em]"
        style={{ color: "var(--text-primary)", fontWeight: 500 }}
      >
        {a?.description ??
          "An adversarial request lands at Atlas's policy endpoint."}
      </p>
      {a && (
        <div
          className="mt-4 flex items-center gap-3 text-[11.5px] font-mono-numbers"
          style={{ color: "var(--text-secondary)" }}
        >
          <span style={{ color: "var(--text-quaternary)" }}>type</span>
          <span>{a.type.replace("_", " ")}</span>
          <span style={{ color: "var(--text-quaternary)" }}>·</span>
          <span style={{ color: "var(--text-quaternary)" }}>refused by</span>
          <span style={{ color: "var(--attack)", fontWeight: 600 }}>
            {a.blockedReason}
          </span>
        </div>
      )}
    </div>
  );
}

function TerminalVisual() {
  return (
    <div
      className="mx-auto max-w-[640px] rounded-[16px] overflow-hidden font-mono-numbers text-[12.5px] leading-[1.7]"
      style={{
        background: "#0B0B0F",
        color: "#E4E4E7",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 24px 64px -24px rgba(0,0,0,0.24)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />
        <span
          className="ml-1 text-[10.5px]"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          solana-cli · devnet
        </span>
      </div>
      <div className="px-4 py-4">
        <div>
          <span style={{ color: "#7FDBCA" }}>~/kyvern</span>
          <span style={{ color: "rgba(255,255,255,0.28)" }}>{" "}❯{" "}</span>
          solana confirm -v <span style={{ color: "rgba(255,255,255,0.42)" }}>3KgiZm4y…yk1b</span>
        </div>
        <div className="mt-2">
          <span style={{ color: "rgba(255,255,255,0.28)" }}>[00:00:00.091]</span>{" "}
          Program log: Error Code:{" "}
          <span style={{ color: "#F97583", fontWeight: 700 }}>
            MerchantNotAllowlisted
          </span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.28)" }}>[00:00:00.092]</span>{" "}
          Program log: Error Number:{" "}
          <span style={{ color: "#79B8FF" }}>12003</span>
        </div>
        <div
          className="mt-2 pt-2 flex items-center justify-between"
          style={{ borderTop: "0.5px dashed rgba(255,255,255,0.08)" }}
        >
          <span style={{ color: "#F97583", fontWeight: 700 }}>
            ✗ transaction reverted · 0 USDC moved
          </span>
          <span style={{ color: "rgba(255,255,255,0.42)" }}>exit 1</span>
        </div>
      </div>
    </div>
  );
}

function CtaVisual({ state }: { state: AtlasStateLite | null }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="inline-flex items-center gap-3 px-5 py-3 rounded-full font-mono-numbers text-[12.5px]"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <span style={{ color: "var(--text-quaternary)" }}>Funds lost:</span>
        <span style={{ color: "var(--success-deep)", fontWeight: 700 }}>
          {fmtUsd(state?.fundsLostUsd ?? 0)}
        </span>
        <span style={{ color: "var(--text-quaternary)" }}>·</span>
        <span style={{ color: "var(--text-quaternary)" }}>Spent safely:</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {fmtUsd(state?.totalSpentUsd ?? 0)}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Transport control
   ──────────────────────────────────────────────────────────────── */

function TransportButton({
  children,
  accent,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  accent?: boolean;
  disabled?: boolean;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
      style={{
        width: accent ? 36 : 30,
        height: accent ? 36 : 30,
        background: accent ? "var(--text-primary)" : "var(--surface-2)",
        color: accent ? "var(--background)" : "var(--text-primary)",
        border: accent ? "none" : "0.5px solid var(--border-subtle)",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
