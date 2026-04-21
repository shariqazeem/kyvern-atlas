"use client";

/* ════════════════════════════════════════════════════════════════════
   /login — premium sign-in page.

   One-screen, one-primary action. Privy handles the modal; this page
   owns the aesthetic around it. Supports email, Google, and wallet.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

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

  const redirectTo = params.get("redirect") || "/app";

  // If they're already signed in, bounce them to where they were headed.
  useEffect(() => {
    if (!ready) return;
    if (authenticated || isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [ready, authenticated, isAuthenticated, router, redirectTo]);

  const onSignIn = () => {
    // Privy handles its own modal — email, google, wallet.
    login();
  };

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
        className="relative w-full max-w-[460px]"
      >
        {/* Brand mark — links home */}
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

        {/* Card */}
        <div
          className="card-elevated p-8 sm:p-10"
          style={{ background: "var(--surface)" }}
        >
          {/* Eyebrow pill */}
          <div className="flex justify-center mb-5">
            <span
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold tracking-[0.02em]"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border-subtle)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              SIGN IN
            </span>
          </div>

          <h1
            className="text-center mb-2"
            style={{
              fontSize: "30px",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
            }}
          >
            Welcome back.
          </h1>
          <p
            className="text-center text-[14.5px] leading-[1.5] mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to create and manage your agent vaults. One click, no
            passwords — email, Google, or wallet.
          </p>

          {/* Primary CTA */}
          <button
            onClick={onSignIn}
            disabled={!ready || isLoading}
            className="group w-full inline-flex items-center justify-center gap-2 h-[52px] rounded-[14px] text-[15px] font-semibold tracking-[-0.01em] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: "var(--text-primary)",
              color: "var(--background)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.10)",
            }}
          >
            {!ready ? "Loading…" : "Continue"}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>

          {/* Method row */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(["Email", "Google", "Wallet"] as const).map((label) => (
              <div
                key={label}
                className="flex items-center justify-center h-9 rounded-[10px] text-[11.5px] font-semibold tracking-[-0.005em]"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "0.5px solid var(--border-subtle)",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div
            className="mt-8 pt-6 border-t space-y-2.5"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <TrustRow
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              text="Your wallet never leaves your device"
            />
            <TrustRow
              icon={<Lock className="w-3.5 h-3.5" />}
              text="Every vault is a Squads v4 smart account"
            />
            <TrustRow
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              text="Agents get budgets, not keys"
            />
          </div>
        </div>

        {/* Below-card sub-links */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>
            New here?{" "}
            <Link
              href="/vault/new"
              className="font-semibold hover:underline underline-offset-4"
              style={{ color: "var(--text-primary)" }}
            >
              Create a vault
            </Link>
          </span>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <Link
            href="/docs"
            className="hover:underline underline-offset-4"
          >
            Docs
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

function TrustRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex items-center gap-2.5 text-[12.5px]"
      style={{ color: "var(--text-secondary)" }}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: "var(--surface-2)",
          color: "var(--text-primary)",
        }}
      >
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
