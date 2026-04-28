"use client";

/* ════════════════════════════════════════════════════════════════════
   /login — pick-up-your-device entry surface.

   Two cards. One picks "Get a Kyvern device" (fresh) and routes to
   /unbox after Privy login completes. The other picks "I own a Kyvern
   device" (returning) and routes to /app with a brief welcome.

   Privy still owns the auth modal — this page owns the framing only.
   The fresh-vs-returning split is held in sessionStorage so it
   survives the Privy modal redirect cycle, and consumed once on
   landing in /unbox or /app.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Package, ShieldCheck } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** sessionStorage flag — read once on /unbox or /app entry to know
 *  whether to play the unboxing cinematic. */
const ONBOARD_MODE_KEY = "kyvern:onboard-mode";
type OnboardMode = "fresh" | "returning";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="h-10 w-10 rounded-full border-2 border-black/10 border-t-black animate-spin" />
    </main>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, ready, authenticated } = usePrivy();
  const { isAuthenticated, isLoading } = useAuth();

  // Track the mode the user chose so we can pick the right post-auth
  // destination. The flag lives in sessionStorage so it survives the
  // Privy modal/redirect cycle (Privy can swap windows mid-flow).
  const [pickedMode, setPickedMode] = useState<OnboardMode | null>(null);

  // ?redirect= comes from ConnectGate when an unauthenticated user
  // lands on a deep-linked /app route — we want to bounce them back
  // there once Privy finishes. But the explicit "Get a Kyvern device"
  // pick should ALWAYS win over a stale redirect — otherwise the
  // unboxing cinematic gets skipped because the user was sent to
  // /login from /app and the redirect param wins.
  const explicitRedirect = params.get("redirect");

  useEffect(() => {
    if (!ready) return;
    if (!(authenticated || isAuthenticated)) return;

    // Read the picker mode the user just set by clicking one of the
    // two cards. This is the strongest signal — it's a fresh user
    // intent, set milliseconds ago.
    let mode: OnboardMode | null = null;
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(ONBOARD_MODE_KEY);
      if (raw === "fresh" || raw === "returning") mode = raw;
    }

    // "Fresh" → always /unbox, even if a ?redirect= is present. The
    // cinematic is the whole point of picking the fresh card.
    if (mode === "fresh") {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(ONBOARD_MODE_KEY);
      }
      router.replace("/unbox");
      return;
    }

    // "Returning" → respect the deep link if present, else /app.
    if (mode === "returning") {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(ONBOARD_MODE_KEY);
      }
      router.replace(explicitRedirect || "/app");
      return;
    }

    // No picker mode (e.g. already-auth'd user lands on /login from a
    // bookmark) — pure redirect or /app.
    router.replace(explicitRedirect || "/app");
  }, [ready, authenticated, isAuthenticated, router, explicitRedirect]);

  const handlePick = (mode: OnboardMode) => {
    setPickedMode(mode);
    if (mode === "fresh") {
      // Get a Kyvern device → Privy modal → /unbox cinematic
      if (typeof window !== "undefined") {
        sessionStorage.setItem(ONBOARD_MODE_KEY, mode);
      }
      login();
    } else {
      // I own a Kyvern device → /recover (paste your device key).
      // No Privy modal yet — /recover handles silent guest auth +
      // importWallet under the hood once they paste a valid key.
      router.push("/recover");
    }
  };

  const isBusy = !ready || isLoading;

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Soft dot-grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-60"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 40%, black 35%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 40%, black 35%, transparent 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease }}
        className="relative w-full max-w-[860px]"
      >
        {/* Brand mark */}
        <div className="flex items-center justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group"
            aria-label="KyvernLabs home"
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-0.5"
              style={{ background: "var(--text-primary)" }}
            >
              <span className="text-white text-[15px] font-bold tracking-tight">
                K
              </span>
            </div>
            <span
              className="text-[16px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--text-primary)" }}
            >
              KyvernLabs
            </span>
          </Link>
        </div>

        {/* Eyebrow + headline */}
        <div className="text-center mb-9">
          <span
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold tracking-[0.06em] uppercase mb-5"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            Pick up your device
          </span>
          <h1
            className="mb-2"
            style={{
              fontSize: "32px",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
            }}
          >
            Your Kyvern device.
          </h1>
          <p
            className="text-[14.5px] leading-[1.55] mx-auto max-w-[420px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Each Kyvern device is a real Solana wallet with workers
            living inside it. Pick one up — or recover one you already own.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Get a device — primary */}
          <DeviceCard
            kind="fresh"
            picked={pickedMode === "fresh"}
            disabled={isBusy}
            onClick={() => handlePick("fresh")}
            icon={<Package className="w-5 h-5" strokeWidth={1.7} />}
            label="Get a Kyvern device"
            description="Unbox a fresh device. Save the device key. Spawn your first worker."
            cta={pickedMode === "fresh" ? "Opening modal…" : "Get a device"}
            primary
          />
          {/* I own a device — secondary, routes to /recover */}
          <DeviceCard
            kind="returning"
            picked={pickedMode === "returning"}
            disabled={isBusy}
            onClick={() => handlePick("returning")}
            icon={<KeyRound className="w-5 h-5" strokeWidth={1.7} />}
            label="I own a Kyvern device"
            description="Paste your device key to recover. Or sign back in with your account."
            cta={pickedMode === "returning" ? "Opening recover…" : "Recover device"}
          />
        </div>

        {/* Below-cards sub-links */}
        <div
          className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <Link href="/docs" className="hover:underline underline-offset-4">
            Docs
          </Link>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/atlas" className="hover:underline underline-offset-4">
            See Atlas live
          </Link>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/" className="hover:underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────
   DeviceCard — both options share this shape. Primary uses a dark
   pill CTA, secondary uses a hairline outline. Hover lifts the card
   ~2px and the icon glows.
   ──────────────────────────────────────────────────────────────────── */

function DeviceCard({
  picked,
  disabled,
  onClick,
  icon,
  label,
  description,
  cta,
  primary,
}: {
  kind: OnboardMode;
  picked: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.25, ease }}
      className="card-elevated text-left p-6 disabled:opacity-70 disabled:cursor-not-allowed group"
      style={{
        background: "var(--surface)",
        opacity: picked ? 0.92 : 1,
      }}
    >
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center transition-all duration-300 group-hover:scale-105"
          style={{
            background: primary ? "var(--text-primary)" : "var(--surface-2)",
            color: primary ? "var(--background)" : "var(--text-primary)",
            boxShadow: primary
              ? "0 6px 16px -6px rgba(0,0,0,0.25)"
              : "inset 0 0 0 0.5px var(--border-subtle)",
          }}
        >
          {icon}
        </div>
        {primary && (
          <span
            className="font-mono text-[9.5px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(34,197,94,0.10)",
              color: "#15803D",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            New
          </span>
        )}
      </div>

      <h3
        className="text-[18px] font-semibold tracking-[-0.015em] mb-1.5"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </h3>
      <p
        className="text-[13.5px] leading-[1.5] mb-5"
        style={{ color: "var(--text-secondary)" }}
      >
        {description}
      </p>

      <div
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em]"
        style={
          primary
            ? {
                background: "var(--text-primary)",
                color: "var(--background)",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.10)",
              }
            : {
                background: "transparent",
                color: "var(--text-primary)",
                border: "0.5px solid var(--border-subtle)",
              }
        }
      >
        {cta}
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </div>
    </motion.button>
  );
}
