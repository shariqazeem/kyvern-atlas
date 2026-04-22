"use client";

/**
 * The 3-scene welcome autoplay. Pattern mirrors /tour but shorter
 * (12s instead of 30s) and more personal — this is "you just joined
 * the network" framing, not a product demo.
 *
 * Controls:
 *   · Auto-advances every SCENE_MS
 *   · Space pauses / resumes
 *   · "Skip to workspace" button at top-right exits immediately
 *   · On last scene's exit, we set localStorage kyvern:welcomeSeen=1
 *     and router.replace("/app")
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Pause, Play, X } from "lucide-react";
import { EASE_PREMIUM as EASE, EASE_SPRING as SPRING } from "@/lib/motion";
import { LiveTimer } from "@/components/atlas/live-timer";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { fmtInt, fmtUsd } from "@/lib/format";

const SCENE_MS = 4_000;
const WELCOME_SEEN_KEY = "kyvern:welcomeSeen";

interface AtlasLite {
  running: boolean;
  firstIgnitionAt: string | null;
  totalSettled: number;
  totalAttacksBlocked: number;
  totalBlocked: number;
  totalSpentUsd: number;
  fundsLostUsd: number;
}

export function WelcomeClient({
  initialState,
}: {
  initialState: AtlasLite | null;
}) {
  const router = useRouter();
  const scenes = useMemo(() => makeScenes(initialState), [initialState]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const startRef = useRef<number>(Date.now());
  const [, setNow] = useState(0);

  // Flag completion + bounce to /app.
  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
    router.replace("/app");
  }, [router]);

  // Keyboard shortcut — space to pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
        startRef.current = Date.now();
      } else if (e.code === "Escape") {
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  // Auto-advance loop.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - startRef.current >= SCENE_MS) {
        if (idx >= scenes.length - 1) {
          clearInterval(id);
          // Small beat so the last scene's copy fully reads before exit.
          setTimeout(finish, 600);
          return;
        }
        setIdx((i) => Math.min(scenes.length - 1, i + 1));
        startRef.current = Date.now();
      }
    }, 100);
    return () => clearInterval(id);
  }, [playing, idx, scenes.length, finish]);

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
      {/* Ambient dot grid */}
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

      {/* Skip */}
      <button
        onClick={finish}
        className="fixed top-5 right-5 z-20 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-semibold transition-colors"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        Skip to workspace
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Scene number */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-20">
        <div
          className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[11px] font-mono-numbers"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--agent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {idx + 1} of {scenes.length} · welcome
        </div>
      </div>

      {/* Scene stage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.key}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.7, ease: SPRING }}
            className="flex flex-col items-center w-full max-w-4xl"
          >
            <div className="w-full mb-8">{scene.visual}</div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
              className="text-center text-balance mx-auto max-w-[660px]"
              style={{
                fontSize: "clamp(22px, 3.2vw, 36px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {scene.narration}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress + pause control */}
      <div className="fixed bottom-0 inset-x-0 z-20">
        <div className="mx-auto max-w-4xl px-6 pb-3 pt-2">
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
        <div
          className="px-6 py-3 flex items-center justify-between gap-4"
          style={{
            background: "var(--surface)",
            borderTop: "0.5px solid var(--border-subtle)",
          }}
        >
          <Link
            href="/"
            className="text-[11px] font-mono-numbers transition-opacity hover:opacity-80"
            style={{ color: "var(--text-quaternary)" }}
          >
            kyvernlabs.com
          </Link>
          <button
            onClick={() => {
              setPlaying((p) => !p);
              startRef.current = Date.now();
            }}
            aria-label={playing ? "Pause" : "Play"}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-95"
            style={{
              background: "var(--text-primary)",
              color: "var(--background)",
            }}
          >
            {playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <span
            className="text-[11px] font-mono-numbers"
            style={{ color: "var(--text-quaternary)" }}
          >
            space · pause
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Scene factory — 3 acts with real Atlas numbers.
   ──────────────────────────────────────────────────────────────── */

interface Scene {
  key: string;
  narration: React.ReactNode;
  visual: React.ReactNode;
}

function makeScenes(s: AtlasLite | null): Scene[] {
  const attacks = (s?.totalAttacksBlocked ?? 0) + (s?.totalBlocked ?? 0);
  return [
    {
      key: "joined",
      narration: (
        <>
          You just joined a network of{" "}
          <span style={{ fontWeight: 700 }}>agents running real money</span>{" "}
          on Solana.
        </>
      ),
      visual: <JoinVisual />,
    },
    {
      key: "atlas",
      narration: (
        <>
          Atlas is the reference agent. It&apos;s been operating for{" "}
          <strong>{s?.firstIgnitionAt ? "days" : "a while"}</strong> —{" "}
          {fmtInt(s?.totalSettled ?? 0)} settled payments, {fmtInt(attacks)}{" "}
          attacks refused, {fmtUsd(s?.fundsLostUsd ?? 0)} lost.
        </>
      ),
      visual: <AtlasVisual state={s} attacks={attacks} />,
    },
    {
      key: "yours",
      narration: (
        <>
          In a minute, your agent will be here too —{" "}
          <span style={{ fontWeight: 700 }}>
            with rules the chain refuses to break.
          </span>
        </>
      ),
      visual: <YoursVisual />,
    },
  ];
}

/* ────────────────────────────────────────────────────────────────
   Scene visuals — deliberately simple so the narration leads.
   ──────────────────────────────────────────────────────────────── */

function JoinVisual() {
  return (
    <div className="flex items-center justify-center h-[200px]">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.05, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 2, ease: SPRING }}
        className="relative"
      >
        {/* Expanding rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid var(--agent)" }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.8 + i * 0.4, opacity: [0, 0.5, 0] }}
            transition={{
              duration: 2.4,
              delay: 0.4 + i * 0.3,
              repeat: Infinity,
              repeatDelay: 1,
              ease: EASE,
            }}
          />
        ))}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center relative"
          style={{
            background: "var(--agent)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.03), 0 24px 64px -20px rgba(79,70,229,0.45)",
          }}
        >
          <div
            className="w-14 h-14 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function AtlasVisual({
  state,
  attacks,
}: {
  state: AtlasLite | null;
  attacks: number;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[560px] rounded-[18px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 24px 64px -20px rgba(0,0,0,0.14)",
      }}
    >
      {/* Chrome */}
      <div
        className="flex items-center gap-1.5 px-4 py-2"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
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
        <span
          className="ml-2 text-[10.5px] font-mono-numbers"
          style={{ color: "var(--text-quaternary)" }}
        >
          atlas · live
        </span>
        <span className="ml-auto flex items-center gap-1">
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
        </span>
      </div>
      {/* Grid of 3 live stats */}
      <div className="grid grid-cols-3 gap-3 p-5">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Uptime
          </p>
          {state?.firstIgnitionAt ? (
            <LiveTimer
              since={state.firstIgnitionAt}
              className="mt-1 block text-[24px] font-semibold tracking-tight leading-none"
              style={{
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          ) : (
            <p
              className="mt-1 text-[24px] font-semibold tracking-tight leading-none"
              style={{ color: "var(--text-tertiary)" }}
            >
              just now
            </p>
          )}
        </div>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Attacks survived
          </p>
          <p
            className="mt-1 text-[24px] font-semibold tracking-tight leading-none"
            style={{
              color: "var(--attack)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <NumberScramble value={attacks} format={fmtInt} />
          </p>
        </div>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Lost
          </p>
          <p
            className="mt-1 text-[24px] font-semibold tracking-tight leading-none"
            style={{
              color: "var(--success-deep)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtUsd(state?.fundsLostUsd ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function YoursVisual() {
  return (
    <div className="flex items-center justify-center h-[200px]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: SPRING }}
        className="rounded-[20px] px-6 py-5 inline-flex items-center gap-4"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.14)",
        }}
      >
        <div
          className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[26px]"
          style={{ background: "var(--surface-2)" }}
        >
          ✨
        </div>
        <div className="text-left">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Your next agent
          </p>
          <p
            className="text-[16px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            A few minutes away.
          </p>
        </div>
        <span className="flex items-center gap-1 ml-4">
          <motion.span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--agent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--agent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--agent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
        </span>
      </motion.div>
      {/* Suppress unused X import — saved for future skip-button variants */}
      {false && <X />}
    </div>
  );
}
