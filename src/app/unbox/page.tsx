"use client";

/* ════════════════════════════════════════════════════════════════════
   /unbox — the unboxing cinematic.

   Surface ritual, not a settings page. Fullscreen dark register
   (museum-mode like /atlas, intentionally distinct from the light
   /app theme). Authenticated users land here from /login when they
   pick "Get a Kyvern device". The cinematic plays once per session;
   on completion the user lands in /app.

   Stages:
     1. closed   — closed Kyvern box, "tap to begin" hint
     2. opening  — lid lifts (rotateX -118°), device slides up out of glow
     3. serial   — KVN-XXXXXXXX typewrites in (~80ms/char) under device
     4. boot     — three-dot LED boot: auth → vault → ready (~2.6s)
     5. ready    — device is alive; "Reveal your device key" CTA shown
     6. verify   — Privy modal closed; user pastes the base58 key back
                   into our dark register input, validated locally with
                   Keypair.fromSecretKey + base58 decode + pubkey compare.
                   No bytes ever go to the server.
     7. claimed  — paste verified; "Your device is yours" → /app
     8. managed  — alternate ready terminus for users who signed in with
                   an external Solana wallet (Phantom/Solflare/Backpack).
                   Their key already lives in that wallet; skip the
                   reveal+verify ritual entirely.

   The cinematic deliberately gates progress on the click/tap. No
   auto-play. The whole point of unboxing is the agency of opening
   the box yourself.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Eye, RefreshCw } from "lucide-react";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { useAuth } from "@/hooks/use-auth";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { useExportWallet } from "@privy-io/react-auth/solana";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Stage =
  | "closed"
  | "opening"
  | "serial"
  | "boot"
  | "ready"
  | "verify"
  | "claimed"
  | "managed";

/** Verifies a pasted base58 string is the secret key for `expectedPubkey`.
 *  Pure local check — bytes never leave the browser. */
function verifyDeviceKey(pasted: string, expectedPubkey: string): boolean {
  try {
    const trimmed = pasted.trim();
    if (!trimmed) return false;
    const secret = bs58.decode(trimmed);
    // Solana ed25519 secret keys are 64 bytes (priv + pub concatenated).
    if (secret.length !== 64) return false;
    const kp = Keypair.fromSecretKey(secret);
    return kp.publicKey.toBase58() === expectedPubkey;
  } catch {
    return false;
  }
}

function deriveSerial(wallet: string | null): string {
  if (!wallet) return "KVN-________";
  return `KVN-${wallet.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

export default function UnboxPage() {
  const router = useRouter();
  const { wallet, isAuthenticated, isLoading } = useAuth();
  const { user } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { exportWallet } = useExportWallet();
  const [stage, setStage] = useState<Stage>("closed");
  const [pasted, setPasted] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Auth gate: only authenticated users see the cinematic. Send
  // unauth'd users back to /login. While loading, render the
  // black backdrop only — no flash of content.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // Embedded vs external wallet detection. The connected wallet shape
  // from useWallets() (Solana subpath) intentionally hides connector
  // details — `walletClientType` lives on the linked account in
  // `user.linkedAccounts`, not on the connected wallet directly. We
  // match by address.
  const activeWallet = useMemo(() => {
    if (!wallet || !solanaWallets) return null;
    return solanaWallets.find((w) => w.address === wallet) ?? null;
  }, [wallet, solanaWallets]);

  const walletClientType = useMemo(() => {
    if (!wallet || !user?.linkedAccounts) return null;
    for (const acct of user.linkedAccounts) {
      if (
        acct.type === "wallet" &&
        "address" in acct &&
        acct.address === wallet &&
        "walletClientType" in acct
      ) {
        return (acct as { walletClientType?: string }).walletClientType ?? null;
      }
    }
    return null;
  }, [wallet, user]);

  const isEmbedded = walletClientType === "privy" || walletClientType === "privy-v2";
  const externalWalletLabel = useMemo(() => {
    if (!walletClientType) return "your wallet";
    return walletClientType.charAt(0).toUpperCase() + walletClientType.slice(1);
  }, [walletClientType]);

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

  const handleReveal = useCallback(async () => {
    if (!activeWallet || !isEmbedded) return;
    setExporting(true);
    setExportError(null);
    try {
      // Privy opens its own modal showing the base58 secret key.
      // The promise resolves once the user dismisses the modal.
      // Bytes never leave Privy's iframe — we only know "the user
      // saw the key and closed the modal".
      await exportWallet({ address: activeWallet.address });
      setStage("verify");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export was cancelled.");
    } finally {
      setExporting(false);
    }
  }, [activeWallet, isEmbedded, exportWallet]);

  // Once the user has pasted a valid key, advance to claimed.
  const pasteIsValid = useMemo(
    () => (wallet ? verifyDeviceKey(pasted, wallet) : false),
    [pasted, wallet],
  );
  const pasteShownButWrong = pasted.trim().length > 0 && !pasteIsValid;

  const handleConfirmPaste = useCallback(() => {
    if (!pasteIsValid) return;
    setStage("claimed");
    // Burn the paste from memory so it doesn't sit in React state.
    setPasted("");
  }, [pasteIsValid]);

  const handleSkipExternal = useCallback(() => {
    // External-wallet users skip the reveal+verify ritual — their
    // device key already lives in their existing wallet app.
    setStage("managed");
  }, []);

  const handleContinue = useCallback(() => {
    router.push("/app");
  }, [router]);

  // Visual gate helpers — many UI blocks need to stay visible across
  // any post-boot stage (ready / verify / claimed / managed), so we
  // factor it once.
  const postBoot = stage === "ready" || stage === "verify" || stage === "claimed" || stage === "managed";

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

      {/* Stage stack — box → device → serial → boot → reveal/verify/claimed */}
      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center gap-7">
        <BoxAndDevice stage={stage} onOpen={openBox} postBoot={postBoot} />

        <AnimatePresence>
          {(stage === "serial" || stage === "boot" || postBoot) && (
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
          {(stage === "boot" || postBoot) && (
            <motion.div
              key="boot-block"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
            >
              <LedBoot stageReady={postBoot} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* READY — embedded wallet → reveal-key CTA. External wallet → managed pill. */}
        <AnimatePresence>
          {stage === "ready" && isEmbedded && (
            <RevealCard
              key="reveal"
              busy={exporting}
              error={exportError}
              onReveal={handleReveal}
              onAlreadySaved={() => setStage("verify")}
            />
          )}
          {stage === "ready" && !isEmbedded && activeWallet && (
            <ManagedCard
              key="managed-prompt"
              walletLabel={externalWalletLabel}
              onContinue={handleSkipExternal}
            />
          )}
        </AnimatePresence>

        {/* VERIFY — paste-back input, validated locally. */}
        <AnimatePresence>
          {stage === "verify" && (
            <VerifyCard
              key="verify"
              pasted={pasted}
              onChange={setPasted}
              valid={pasteIsValid}
              wrong={pasteShownButWrong}
              onConfirm={handleConfirmPaste}
              onShowAgain={handleReveal}
            />
          )}
        </AnimatePresence>

        {/* CLAIMED / MANAGED — final success card */}
        <AnimatePresence>
          {(stage === "claimed" || stage === "managed") && (
            <ClaimedCard
              key="claimed"
              variant={stage === "managed" ? "managed" : "claimed"}
              walletLabel={externalWalletLabel}
              onContinue={handleContinue}
            />
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
  postBoot,
}: {
  stage: Stage;
  onOpen: () => void;
  postBoot: boolean;
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
          opacity: postBoot ? 0 : 1,
          y: postBoot ? 24 : 0,
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
                opacity: postBoot ? 0 : 1,
                y: postBoot ? -10 : 0,
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
  const [step, setStep] = useState(stageReady ? 3 : 0);

  useEffect(() => {
    if (stageReady) {
      setStep(3);
      return;
    }
    const t1 = window.setTimeout(() => setStep(1), 0);
    const t2 = window.setTimeout(() => setStep(2), 850);
    const t3 = window.setTimeout(() => setStep(3), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stageReady]);

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

/* ────────────────────────────────────────────────────────────────────
   RevealCard — stage="ready", embedded wallet path. Frames the
   moment + triggers Privy's exportWallet modal. Includes an
   "already saved" escape hatch for users who want to skip directly
   to the verify screen.
   ──────────────────────────────────────────────────────────────────── */

function RevealCard({
  busy,
  error,
  onReveal,
  onAlreadySaved,
}: {
  busy: boolean;
  error: string | null;
  onReveal: () => void;
  onAlreadySaved: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="w-full rounded-[16px] px-5 py-5"
      style={{
        background: "rgba(231,233,238,0.04)",
        border: "1px solid rgba(231,233,238,0.10)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div className="text-center">
        <div
          className="font-mono uppercase mb-2"
          style={{
            color: "rgba(231,233,238,0.55)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
          }}
        >
          Your device key is ready
        </div>
        <p
          className="text-[13.5px] leading-[1.55] mb-4"
          style={{ color: "rgba(231,233,238,0.78)" }}
        >
          Your Kyvern device is a Solana wallet. The key below is the
          only way to recover it. <strong style={{ color: "#FFFFFF" }}>We can&apos;t recover it for you.</strong>
        </p>

        <motion.button
          type="button"
          onClick={onReveal}
          disabled={busy}
          whileHover={busy ? undefined : { y: -1 }}
          whileTap={busy ? undefined : { scale: 0.98 }}
          className="inline-flex items-center gap-2 h-[48px] px-6 rounded-[12px] text-[13.5px] font-semibold tracking-[-0.005em] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "#FFFFFF",
            color: "#0A0B10",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.45)",
          }}
        >
          <Eye className="w-4 h-4" strokeWidth={1.8} />
          {busy ? "Opening Privy…" : "Reveal device key"}
        </motion.button>

        {error && (
          <div
            className="mt-3 font-mono"
            style={{
              fontSize: 11,
              color: "#F59E0B",
              letterSpacing: "0.04em",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onAlreadySaved}
          className="mt-4 font-mono uppercase tracking-[0.16em] hover:underline"
          style={{
            fontSize: 9.5,
            color: "rgba(231,233,238,0.45)",
          }}
        >
          Already saved? Skip to verify
        </button>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ManagedCard — stage="ready", external wallet path. The user signed
   in with Phantom/Solflare/Backpack; their key already lives there.
   Skip the export+verify ritual entirely.
   ──────────────────────────────────────────────────────────────────── */

function ManagedCard({
  walletLabel,
  onContinue,
}: {
  walletLabel: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="w-full rounded-[16px] px-5 py-5 text-center"
      style={{
        background: "rgba(231,233,238,0.04)",
        border: "1px solid rgba(231,233,238,0.10)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="font-mono uppercase mb-2"
        style={{
          color: "rgba(231,233,238,0.55)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
        }}
      >
        Managed by {walletLabel}
      </div>
      <p
        className="text-[13.5px] leading-[1.55] mb-4"
        style={{ color: "rgba(231,233,238,0.78)" }}
      >
        Your device key already lives in {walletLabel}. Sign there
        when your worker spends — Kyvern stays out of the way.
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
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   VerifyCard — stage="verify". User pastes the base58 device key
   they (hopefully) saved from Privy's modal. We validate locally
   with Keypair.fromSecretKey + base58 decode and compare the derived
   public key to their wallet address. No bytes go to the server.
   ──────────────────────────────────────────────────────────────────── */

function VerifyCard({
  pasted,
  onChange,
  valid,
  wrong,
  onConfirm,
  onShowAgain,
}: {
  pasted: string;
  onChange: (s: string) => void;
  valid: boolean;
  wrong: boolean;
  onConfirm: () => void;
  onShowAgain: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="w-full rounded-[16px] px-5 py-5"
      style={{
        background: "rgba(231,233,238,0.04)",
        border: valid
          ? "1px solid rgba(34,197,94,0.45)"
          : wrong
            ? "1px solid rgba(245,158,11,0.45)"
            : "1px solid rgba(231,233,238,0.10)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="font-mono uppercase mb-2 text-center"
        style={{
          color: valid ? "#22C55E" : "rgba(231,233,238,0.55)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
        }}
      >
        {valid ? "Match — your device is yours" : "Confirm you saved it"}
      </div>
      <p
        className="text-[13.5px] leading-[1.55] mb-3 text-center"
        style={{ color: "rgba(231,233,238,0.78)" }}
      >
        Paste your device key here to prove you&apos;ve got it.
      </p>

      <textarea
        value={pasted}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste base58 device key…"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        rows={3}
        className="w-full font-mono text-[12px] leading-[1.4] outline-none resize-none rounded-[10px] px-3 py-2.5"
        style={{
          background: "rgba(0,0,0,0.40)",
          color: "#E7E9EE",
          border: "1px solid rgba(231,233,238,0.12)",
          letterSpacing: "0.01em",
        }}
      />

      <div className="flex items-center justify-between mt-3 gap-3">
        <button
          type="button"
          onClick={onShowAgain}
          className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] hover:underline"
          style={{
            fontSize: 9.5,
            color: "rgba(231,233,238,0.55)",
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Show me the key again
        </button>

        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={!valid}
          whileHover={valid ? { y: -1 } : undefined}
          whileTap={valid ? { scale: 0.97 } : undefined}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[12.5px] font-semibold tracking-[-0.005em] disabled:cursor-not-allowed"
          style={{
            background: valid ? "#22C55E" : "rgba(231,233,238,0.10)",
            color: valid ? "#04050A" : "rgba(231,233,238,0.45)",
            border: valid ? "none" : "1px solid rgba(231,233,238,0.10)",
            boxShadow: valid
              ? "0 6px 16px rgba(34,197,94,0.35)"
              : "none",
          }}
        >
          {valid ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Confirm
            </>
          ) : (
            "Confirm"
          )}
        </motion.button>
      </div>

      {wrong && !valid && (
        <div
          className="mt-3 text-center font-mono"
          style={{
            fontSize: 10.5,
            color: "#F59E0B",
            letterSpacing: "0.04em",
          }}
        >
          Hmm — that&apos;s not your device key. Try again, or click <em>Show me the key again</em>.
        </div>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ClaimedCard — stage="claimed" (saved + verified) or "managed"
   (external wallet, no verify needed). Final success card. Single
   primary CTA: Open Kyvern → /app.
   ──────────────────────────────────────────────────────────────────── */

function ClaimedCard({
  variant,
  walletLabel,
  onContinue,
}: {
  variant: "claimed" | "managed";
  walletLabel: string;
  onContinue: () => void;
}) {
  const isManaged = variant === "managed";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="w-full rounded-[16px] px-5 py-6 text-center"
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
        <Check className="w-6 h-6" strokeWidth={2} style={{ color: "#22C55E" }} />
      </motion.div>

      <div
        className="font-mono uppercase mb-1.5"
        style={{
          color: "#22C55E",
          fontSize: 10.5,
          letterSpacing: "0.18em",
        }}
      >
        {isManaged ? "Welcome back" : "Saved · Sealed · Solana-native"}
      </div>
      <h2
        className="text-[20px] font-semibold tracking-[-0.015em] mb-3"
        style={{ color: "#FFFFFF" }}
      >
        Your device is yours.
      </h2>
      <p
        className="text-[13px] leading-[1.55] mb-4"
        style={{ color: "rgba(231,233,238,0.72)" }}
      >
        {isManaged
          ? `Signed in via ${walletLabel}. Your workers are waiting.`
          : "Your key is yours alone. Time to spawn your first worker."}
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
    </motion.div>
  );
}
