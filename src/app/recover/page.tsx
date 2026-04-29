"use client";

/* ════════════════════════════════════════════════════════════════════
   /recover — paste-your-device-key recovery surface.

   The "I own a Kyvern device" terminus from /login. Dark register
   matching /unbox — the recovery ritual is the inverse of unboxing,
   so they share the same museum-mode aesthetic.

   Two paths on this page:

   1. PRIMARY: paste your base58 device key → recover silently.
      - Local validation: bs58 decode + Keypair.fromSecretKey + 64 bytes
      - createGuestAccount() — silent Privy guest auth, no email/social UI
      - importWallet({ privateKey }) — Privy embeds the pasted key as
        a wallet for this account
      - Route to /app

   2. SECONDARY: "I have my account, not my key" — opens the standard
      Privy modal (email/Google/wallet). Falls through to the same
      account, restoring the existing embedded wallet via Privy's
      account → wallet binding. Route to /app.

   Both paths land at /app authenticated. The difference is which
   piece of identity the user has in hand.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, KeyRound, RefreshCw } from "lucide-react";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { usePrivy, useGuestAccounts } from "@privy-io/react-auth";
import { useImportWallet } from "@privy-io/react-auth/solana";
import { useAuth } from "@/hooks/use-auth";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Decode a base58 string and check it's a valid 64-byte ed25519
 *  secret. Returns the derived Solana pubkey on success, null on
 *  failure. Pure-local — bytes never leave the browser. */
function decodeDeviceKey(pasted: string): { publicKey: string } | null {
  try {
    const trimmed = pasted.trim();
    if (!trimmed) return null;
    const secret = bs58.decode(trimmed);
    if (secret.length !== 64) return null;
    const kp = Keypair.fromSecretKey(secret);
    return { publicKey: kp.publicKey.toBase58() };
  } catch {
    return null;
  }
}

function deriveSerial(pubkey: string): string {
  return `KVN-${pubkey.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

type Phase =
  | "input"          // user pasting / typing
  | "recovering"     // createGuestAccount + importWallet in flight
  | "recovered"      // success card
  | "error";         // unrecoverable error

export default function RecoverPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { login } = usePrivy();
  const { createGuestAccount } = useGuestAccounts();
  const { importWallet } = useImportWallet();

  const [phase, setPhase] = useState<Phase>("input");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  // If the user is already authenticated and lands here, bounce them
  // straight to /app — no recovery needed.
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && phase === "input") {
      router.replace("/app");
    }
  }, [isLoading, isAuthenticated, phase, router]);

  const decoded = useMemo(() => decodeDeviceKey(pasted), [pasted]);
  const validKey = !!decoded;
  const showInvalid = pasted.trim().length > 0 && !validKey;

  const handleRecover = useCallback(async () => {
    if (!decoded) return;
    setPhase("recovering");
    setError(null);
    try {
      // 1. Silent guest account — no email/social UI shown.
      await createGuestAccount();
      // 2. Attach the pasted key as a Solana embedded wallet for this
      //    account. Privy validates the key + adds it to the user's
      //    wallets. Bytes leave the browser only here, going directly
      //    to Privy's iframe — never to our server.
      await importWallet({ privateKey: pasted.trim() });
      // Burn the paste from React state — the imported wallet is now
      // managed by Privy.
      setPasted("");
      setPhase("recovered");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Recovery failed.";
      setError(msg);
      setPhase("error");
    }
  }, [decoded, createGuestAccount, importWallet, pasted]);

  const handleAccountFallback = useCallback(() => {
    // Standard Privy login — restores existing embedded wallet via
    // account → wallet binding. /login's redirect logic will land
    // them on /app since we don't set onboard-mode=fresh here.
    login();
  }, [login]);

  const handleContinue = useCallback(() => {
    router.push("/app");
  }, [router]);

  const handleRetry = useCallback(() => {
    setPhase("input");
    setError(null);
  }, []);

  return (
    <main
      className="relative flex items-center justify-center px-5 py-12 sm:px-6 sm:py-16 overflow-x-hidden"
      style={{
        // dvh = dynamic viewport height — accounts for iOS Safari's
        // collapsing toolbar so the recover surface doesn't get
        // clipped behind the keyboard.
        minHeight: "100dvh",
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

      {/* Back to /login */}
      <Link
        href="/login"
        className="absolute top-5 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] hover:opacity-80 min-h-[40px] px-1"
        style={{ color: "rgba(231,233,238,0.65)", fontSize: 11 }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="relative z-10 w-full max-w-[460px]">
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <PasteCard
                pasted={pasted}
                onChange={setPasted}
                valid={validKey}
                showInvalid={showInvalid}
                onRecover={handleRecover}
                onAccountFallback={handleAccountFallback}
                derivedPubkey={decoded?.publicKey ?? null}
              />
            </motion.div>
          )}

          {phase === "recovering" && (
            <motion.div
              key="recovering"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <RecoveringCard pubkey={decoded?.publicKey ?? null} />
            </motion.div>
          )}

          {phase === "recovered" && (
            <motion.div
              key="recovered"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <RecoveredCard
                pubkey={null}
                onContinue={handleContinue}
              />
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <ErrorCard
                error={error ?? "Something went wrong."}
                onRetry={handleRetry}
                onAccountFallback={handleAccountFallback}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PasteCard — primary surface. Big base58 textarea + recover CTA +
   account-fallback link beneath.
   ──────────────────────────────────────────────────────────────────── */

function PasteCard({
  pasted,
  onChange,
  valid,
  showInvalid,
  onRecover,
  onAccountFallback,
  derivedPubkey,
}: {
  pasted: string;
  onChange: (s: string) => void;
  valid: boolean;
  showInvalid: boolean;
  onRecover: () => void;
  onAccountFallback: () => void;
  derivedPubkey: string | null;
}) {
  const previewSerial = derivedPubkey ? deriveSerial(derivedPubkey) : null;

  return (
    <>
      {/* Eyebrow + heading */}
      <div className="text-center mb-7">
        <span
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full font-mono uppercase tracking-[0.18em] mb-5"
          style={{
            background: "rgba(231,233,238,0.06)",
            color: "rgba(231,233,238,0.55)",
            border: "1px solid rgba(231,233,238,0.10)",
            fontSize: 10,
          }}
        >
          <KeyRound className="w-3 h-3" />
          Recover device
        </span>
        <h1
          className="mb-2"
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "#FFFFFF",
            lineHeight: 1.1,
          }}
        >
          Paste your device key.
        </h1>
        <p
          className="text-[13.5px] leading-[1.55] mx-auto max-w-[400px]"
          style={{ color: "rgba(231,233,238,0.65)" }}
        >
          Your saved base58 device key restores your Kyvern device,
          your workers, and your funds. We never see the bytes — they
          go straight to Privy.
        </p>
      </div>

      {/* Paste card */}
      <div
        className="rounded-[16px] p-5"
        style={{
          background: "rgba(231,233,238,0.04)",
          border: valid
            ? "1px solid rgba(34,197,94,0.45)"
            : showInvalid
              ? "1px solid rgba(245,158,11,0.45)"
              : "1px solid rgba(231,233,238,0.10)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.40)",
        }}
      >
        <textarea
          value={pasted}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste base58 device key…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          rows={3}
          className="w-full font-mono text-[13px] leading-[1.4] outline-none resize-none rounded-[10px] px-3 py-3"
          style={{
            background: "rgba(0,0,0,0.40)",
            color: "#E7E9EE",
            border: "1px solid rgba(231,233,238,0.12)",
            letterSpacing: "0.01em",
            // Belt-and-suspenders: explicit text selection so iOS
            // Safari's long-press paste menu always shows up here.
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
        />

        {/* Live-validation row */}
        <div className="mt-3 flex items-center justify-between gap-3 min-h-6">
          <div
            className="font-mono"
            style={{ fontSize: 10.5, color: "rgba(231,233,238,0.55)" }}
          >
            {valid && previewSerial && (
              <span style={{ color: "#22C55E" }}>
                ✓ {previewSerial} recognised
              </span>
            )}
            {showInvalid && (
              <span style={{ color: "#F59E0B" }}>
                Hmm — that&apos;s not a valid Solana key.
              </span>
            )}
            {!valid && !showInvalid && (
              <span>Solana base58 secret · 64 bytes</span>
            )}
          </div>

          <motion.button
            type="button"
            onClick={onRecover}
            disabled={!valid}
            whileHover={valid ? { y: -1 } : undefined}
            whileTap={valid ? { scale: 0.97 } : undefined}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em] disabled:cursor-not-allowed"
            style={{
              background: valid ? "#FFFFFF" : "rgba(231,233,238,0.10)",
              color: valid ? "#0A0B10" : "rgba(231,233,238,0.45)",
              border: valid ? "none" : "1px solid rgba(231,233,238,0.10)",
              boxShadow: valid
                ? "0 1px 0 rgba(255,255,255,0.18), 0 8px 22px rgba(0,0,0,0.45)"
                : "none",
            }}
          >
            Recover
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          </motion.button>
        </div>
      </div>

      {/* Secondary fallback */}
      <div className="mt-6 text-center">
        <div
          className="font-mono uppercase tracking-[0.18em] mb-2"
          style={{ color: "rgba(231,233,238,0.40)", fontSize: 10 }}
        >
          Lost your key?
        </div>
        <button
          type="button"
          onClick={onAccountFallback}
          className="text-[14px] font-medium hover:underline underline-offset-4 min-h-[40px] px-3 inline-flex items-center justify-center"
          style={{ color: "rgba(231,233,238,0.85)" }}
        >
          Sign in with your account instead
        </button>
        <p
          className="mt-1.5 text-[12px]"
          style={{ color: "rgba(231,233,238,0.50)" }}
        >
          Email or Google. Your existing Kyvern restores via account.
        </p>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   RecoveringCard — phase="recovering". Spinner + "Reattaching device".
   ──────────────────────────────────────────────────────────────────── */

function RecoveringCard({ pubkey }: { pubkey: string | null }) {
  const previewSerial = pubkey ? deriveSerial(pubkey) : "KVN-________";
  return (
    <div
      className="rounded-[16px] p-7 text-center"
      style={{
        background: "rgba(231,233,238,0.04)",
        border: "1px solid rgba(231,233,238,0.10)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.40)",
      }}
    >
      <motion.div
        className="mx-auto mb-4 w-10 h-10 rounded-full border-2"
        style={{
          borderColor: "rgba(231,233,238,0.18)",
          borderTopColor: "#22C55E",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
      <div
        className="font-mono uppercase tracking-[0.18em] mb-1.5"
        style={{ color: "#22C55E", fontSize: 10.5 }}
      >
        Reattaching device
      </div>
      <h2
        className="text-[18px] font-semibold tracking-[-0.015em]"
        style={{ color: "#FFFFFF" }}
      >
        {previewSerial}
      </h2>
      <p
        className="mt-2 text-[12.5px] leading-[1.55]"
        style={{ color: "rgba(231,233,238,0.65)" }}
      >
        Privy is binding your key to a fresh session. This takes a
        few seconds.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   RecoveredCard — phase="recovered". "Welcome back · KVN-XXXX".
   ──────────────────────────────────────────────────────────────────── */

function RecoveredCard({
  pubkey,
  onContinue,
}: {
  pubkey: string | null;
  onContinue: () => void;
}) {
  const previewSerial = pubkey ? deriveSerial(pubkey) : null;
  return (
    <div
      className="rounded-[16px] p-7 text-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(231,233,238,0.04) 100%)",
        border: "1px solid rgba(34,197,94,0.30)",
        boxShadow:
          "0 8px 28px rgba(0,0,0,0.40), 0 0 0 4px rgba(34,197,94,0.06)",
      }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,197,94,0.30) 0%, rgba(34,197,94,0.05) 70%)",
          border: "1px solid rgba(34,197,94,0.55)",
        }}
      >
        <Check
          className="w-6 h-6"
          strokeWidth={2}
          style={{ color: "#22C55E" }}
        />
      </motion.div>
      <div
        className="font-mono uppercase tracking-[0.18em] mb-1.5"
        style={{ color: "#22C55E", fontSize: 10.5 }}
      >
        {previewSerial ? `${previewSerial} recognised` : "Device recognised"}
      </div>
      <h2
        className="text-[20px] font-semibold tracking-[-0.015em] mb-3"
        style={{ color: "#FFFFFF" }}
      >
        Welcome back.
      </h2>
      <p
        className="text-[13px] leading-[1.55] mb-4"
        style={{ color: "rgba(231,233,238,0.72)" }}
      >
        Your device is reattached. Workers, vaults, and inbox restored.
      </p>
      <motion.button
        type="button"
        onClick={onContinue}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 h-[48px] px-6 rounded-[12px] text-[13.5px] font-semibold tracking-[-0.005em]"
        style={{
          background: "#FFFFFF",
          color: "#0A0B10",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.45)",
        }}
      >
        Open Kyvern
        <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
      </motion.button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ErrorCard — phase="error". Recover failed (Privy reject, network,
   already-imported). Offer retry + account-fallback.
   ──────────────────────────────────────────────────────────────────── */

function ErrorCard({
  error,
  onRetry,
  onAccountFallback,
}: {
  error: string;
  onRetry: () => void;
  onAccountFallback: () => void;
}) {
  return (
    <div
      className="rounded-[16px] p-7 text-center"
      style={{
        background: "rgba(231,233,238,0.04)",
        border: "1px solid rgba(245,158,11,0.45)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.40)",
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.18em] mb-1.5"
        style={{ color: "#F59E0B", fontSize: 10.5 }}
      >
        Recovery failed
      </div>
      <p
        className="text-[13px] leading-[1.55] mb-4"
        style={{ color: "rgba(231,233,238,0.78)" }}
      >
        {error}
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] font-mono uppercase tracking-[0.16em]"
          style={{
            background: "transparent",
            color: "rgba(231,233,238,0.78)",
            border: "1px solid rgba(231,233,238,0.16)",
            fontSize: 10.5,
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
        <button
          type="button"
          onClick={onAccountFallback}
          className="h-9 px-4 rounded-[10px] text-[12.5px] font-semibold"
          style={{
            background: "#FFFFFF",
            color: "#0A0B10",
          }}
        >
          Sign in with account
        </button>
      </div>
    </div>
  );
}
