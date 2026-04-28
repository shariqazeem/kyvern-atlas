"use client";

/* ════════════════════════════════════════════════════════════════════
   /unbox — the unboxing cinematic.

   Surface ritual, not a settings page. Fullscreen dark register
   (museum-mode like /atlas, intentionally distinct from the light
   /app theme). Authenticated users land here from /login when they
   pick "Get a Kyvern device". The cinematic plays once per session;
   on completion the user lands in /app.

   Stages:
     1. Closed-box stage — tap or click to open
     2. Lid lifts, device slides up, soft glow blooms
     3. Serial KVN-XXXXXXXX stamps in (typewriter, ~80ms/char)
     4. LEDs sequentially light: auth → vault → ready (~3s)
     5. CTA appears — "Continue" routes to /app
        (Phase 3 will replace the CTA with the device-key reveal +
        confirm quiz before continue.)

   The cinematic deliberately gates progress on the click/tap. No
   auto-play. The whole point of unboxing is the agency of opening
   the box yourself.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Stage = "closed" | "opening" | "serial" | "boot" | "ready";

function deriveSerial(wallet: string | null): string {
  if (!wallet) return "KVN-________";
  return `KVN-${wallet.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

export default function UnboxPage() {
  const router = useRouter();
  const { wallet, isAuthenticated, isLoading } = useAuth();
  const [stage, setStage] = useState<Stage>("closed");

  // Auth gate: only authenticated users see the cinematic. Send
  // unauth'd users back to /login. While loading, render the
  // black backdrop only — no flash of content.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  const serial = useMemo(() => deriveSerial(wallet), [wallet]);

  const openBox = useCallback(() => {
    if (stage !== "closed") return;
    setStage("opening");
    // Box opens (~1.2s) → device settles → serial begins
    window.setTimeout(() => setStage("serial"), 1300);
    // Serial typewriter takes ~serial.length * 80ms; allow ~1.0s buffer
    window.setTimeout(() => setStage("boot"), 1300 + serial.length * 80 + 200);
    // LED boot takes ~3 dots × 800ms
    window.setTimeout(
      () => setStage("ready"),
      1300 + serial.length * 80 + 200 + 2600,
    );
  }, [stage, serial.length]);

  const handleContinue = useCallback(() => {
    // Phase 3 will swap this for the device-key reveal flow. For now,
    // the unboxing just hands off to /app.
    router.push("/app");
  }, [router]);

  return (
    <main
      className="fixed inset-0 overflow-hidden flex items-center justify-center px-6 select-none"
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 50% 50%, #161821 0%, #0A0B10 70%, #04050A 100%)",
        color: "#E7E9EE",
      }}
    >
      {/* Faint dot grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(231,233,238,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* Eyebrow / step indicator */}
      <div className="absolute top-7 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#22C55E", boxShadow: "0 0 6px #22C55E" }}
        />
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ color: "rgba(231,233,238,0.55)", fontSize: 10 }}
        >
          Unboxing your device
        </span>
      </div>

      {/* Stage stack — box → device → serial → boot → CTA */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center gap-7">
        <BoxAndDevice stage={stage} onOpen={openBox} />

        <AnimatePresence>
          {(stage === "serial" || stage === "boot" || stage === "ready") && (
            <motion.div
              key="serial-block"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex flex-col items-center"
            >
              <SerialStamp text={serial} />
              <BornLine />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(stage === "boot" || stage === "ready") && (
            <motion.div
              key="boot-block"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
            >
              <LedBoot stageReady={stage === "ready"} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage === "ready" && (
            <motion.button
              key="continue"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
              onClick={handleContinue}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 h-[52px] px-7 rounded-[14px] text-[14.5px] font-semibold tracking-[-0.01em]"
              style={{
                background: "#FFFFFF",
                color: "#0A0B10",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.45)",
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {stage === "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(231,233,238,0.45)" }}
          >
            Tap or click the box to begin
          </motion.div>
        )}
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────
   BoxAndDevice — the closed Kyvern box, the lid lift, and the device
   sliding up. One stateful component because the geometry is tightly
   coupled.
   ──────────────────────────────────────────────────────────────────── */

function BoxAndDevice({
  stage,
  onOpen,
}: {
  stage: Stage;
  onOpen: () => void;
}) {
  const isOpenStarted = stage !== "closed";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isOpenStarted}
      className="relative outline-none disabled:cursor-default"
      style={{
        width: 240,
        height: 200,
        perspective: 900,
      }}
      aria-label="Open the Kyvern box"
    >
      {/* Box body */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-[18px]"
        style={{
          width: 200,
          height: 130,
          bottom: 8,
          background:
            "linear-gradient(180deg, #1E2230 0%, #14171F 60%, #0E1018 100%)",
          border: "1px solid rgba(231,233,238,0.10)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.08)",
            "0 12px 28px rgba(0,0,0,0.55)",
            "0 30px 60px -20px rgba(0,0,0,0.85)",
          ].join(", "),
        }}
        animate={{
          opacity: stage === "ready" ? 0 : 1,
          y: stage === "ready" ? 24 : 0,
        }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {/* Bottom KYVERN wordmark — visible only on closed box */}
        <div
          aria-hidden
          className="absolute bottom-3 left-0 right-0 flex justify-center"
        >
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9,
              letterSpacing: "0.32em",
              color: "rgba(231,233,238,0.35)",
            }}
          >
            Kyvern
          </span>
        </div>
      </motion.div>

      {/* Box lid — flips up on open */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-t-[18px]"
        style={{
          width: 200,
          height: 36,
          bottom: 130 + 8,
          background:
            "linear-gradient(180deg, #232838 0%, #161A26 100%)",
          border: "1px solid rgba(231,233,238,0.10)",
          borderBottom: "none",
          transformOrigin: "bottom center",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.10), 0 -2px 6px rgba(0,0,0,0.40)",
        }}
        animate={
          isOpenStarted
            ? {
                rotateX: -118,
                opacity: stage === "ready" ? 0 : 1,
                y: stage === "ready" ? -10 : 0,
              }
            : { rotateX: 0, opacity: 1, y: 0 }
        }
        transition={{
          duration: 0.7,
          ease: EASE,
        }}
      >
        {/* Lid seam highlight */}
        <div
          aria-hidden
          className="absolute bottom-0 left-2 right-2"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(231,233,238,0.18), transparent)",
          }}
        />
      </motion.div>

      {/* Soft glow inside the open box */}
      <AnimatePresence>
        {isOpenStarted && (
          <motion.div
            key="glow"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              width: 180,
              height: 70,
              bottom: 100,
              background:
                "radial-gradient(closest-side, rgba(120,170,255,0.30) 0%, rgba(120,170,255,0) 75%)",
              filter: "blur(3px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* The device — hidden inside the box, slides up on open */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-[16px] flex items-center justify-center"
        style={{
          width: 168,
          height: 100,
          bottom: 20,
          background:
            "linear-gradient(180deg, #2A2F3F 0%, #161A26 100%)",
          border: "1px solid rgba(231,233,238,0.18)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.10)",
            "0 8px 22px rgba(0,0,0,0.55)",
            "0 0 0 1px rgba(120,170,255,0.05)",
          ].join(", "),
        }}
        initial={false}
        animate={
          isOpenStarted
            ? {
                y: stage === "opening" ? -56 : -68,
                opacity: 1,
                scale: stage === "opening" ? 1 : 1.02,
              }
            : { y: 8, opacity: 0, scale: 0.94 }
        }
        transition={{
          duration: 0.9,
          ease: EASE,
          delay: isOpenStarted ? 0.25 : 0,
        }}
      >
        {/* Status LED on the device */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#22C55E",
              boxShadow: "0 0 0 3px rgba(34,197,94,0.18), 0 0 8px #22C55E",
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 8.5,
              letterSpacing: "0.18em",
              color: "rgba(231,233,238,0.55)",
            }}
          >
            Live
          </span>
        </div>

        {/* Device wordmark */}
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "rgba(231,233,238,0.85)",
          }}
        >
          Kyvern
        </span>

        {/* Faux connector pins along the bottom */}
        <div
          aria-hidden
          className="absolute bottom-2 left-4 right-4 flex justify-between"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="rounded-sm"
              style={{
                width: 5,
                height: 2,
                background: "rgba(231,233,238,0.20)",
              }}
            />
          ))}
        </div>
      </motion.div>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SerialStamp — typewriter for KVN-XXXXXXXX. ~80ms per char.
   ──────────────────────────────────────────────────────────────────── */

function SerialStamp({ text }: { text: string }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 80);
    return () => clearInterval(iv);
  }, [text]);

  const isDone = shown.length >= text.length;

  return (
    <span
      className="font-mono uppercase"
      style={{
        fontSize: 16,
        letterSpacing: "0.22em",
        color: "#E7E9EE",
        textShadow: "0 0 12px rgba(120,170,255,0.18)",
      }}
    >
      {shown}
      {!isDone && (
        <motion.span
          className="inline-block ml-[2px]"
          style={{
            width: 8,
            height: 14,
            background: "#E7E9EE",
            verticalAlign: "-2px",
          }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────
   BornLine — small "Born today · 2026-04-28" stamp.
   ──────────────────────────────────────────────────────────────────── */

function BornLine() {
  const date = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  return (
    <span
      className="font-mono uppercase mt-2"
      style={{
        fontSize: 10,
        letterSpacing: "0.18em",
        color: "rgba(231,233,238,0.45)",
      }}
    >
      Born · {date}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────
   LedBoot — three dots: auth → vault → ready. Each ~800ms.
   ──────────────────────────────────────────────────────────────────── */

function LedBoot({ stageReady }: { stageReady: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStep(1), 0);
    const t2 = window.setTimeout(() => setStep(2), 850);
    const t3 = window.setTimeout(() => setStep(3), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // After ready stage, all dots are solid green
  const final = stageReady;

  const dots: { label: string; color: string }[] = [
    { label: "Auth", color: "#22C55E" },
    { label: "Vault", color: "#F59E0B" },
    { label: "Ready", color: "#22C55E" },
  ];

  return (
    <div
      className="flex items-center gap-5 px-5 py-3 rounded-[12px]"
      style={{
        background: "rgba(231,233,238,0.04)",
        border: "1px solid rgba(231,233,238,0.08)",
      }}
    >
      {dots.map((d, i) => {
        const active = step > i;
        const done = final || step > i + 1;
        const showColor = final ? "#22C55E" : d.color;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <motion.span
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: active ? showColor : "rgba(231,233,238,0.16)",
                boxShadow: active
                  ? `0 0 0 3px ${showColor}26, 0 0 12px ${showColor}88`
                  : "none",
              }}
              animate={
                active && !done
                  ? { opacity: [0.55, 1, 0.55] }
                  : { opacity: 1 }
              }
              transition={{ duration: 1.4, repeat: active && !done ? Infinity : 0, ease: "easeInOut" }}
            />
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                color: active ? "rgba(231,233,238,0.85)" : "rgba(231,233,238,0.40)",
              }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
