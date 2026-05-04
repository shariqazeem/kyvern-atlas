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
import { seedDefaultWorkersIfEmpty } from "@/lib/onboarding/seed-workers";

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
  const [justPasted, setJustPasted] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

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

  const handleReveal = useCallback(() => {
    if (!activeWallet || !isEmbedded) return;
    setExportError(null);
    // Fire-and-forget. If we await on exportWallet's promise (which only
    // resolves when the user dismisses the modal), a stuck/blocked
    // Privy modal locks the whole page on "Opening Privy…". Instead
    // we trigger the modal AND advance to the verify card immediately:
    //   - If the modal opens, user copies the key from Privy's UI, closes
    //     it, and is already on the verify card ready to paste.
    //   - If the modal hangs/fails (Privy dashboard misconfig, popup
    //     blocker, etc.), the user can re-trigger via the verify card's
    //     "Show me the key again" button or use the bypass link.
    void exportWallet({ address: activeWallet.address }).catch((e) => {
      console.warn("[unbox] exportWallet failed:", e);
    });
    setStage("verify");
  }, [activeWallet, isEmbedded, exportWallet]);

  const handleBypassVerify = useCallback(() => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(
      "Skip device-key verification?\n\n" +
        "You can still use Kyvern, but if you ever lose this browser " +
        "without saving the key, you'll have to recover via your account " +
        "(email/Google) and the wallet won't be portable to another app.\n\n" +
        "Continue without saving the key?",
    );
    if (confirmed) {
      setPasted("");
      setStage("claimed");
    }
  }, []);

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

  const handlePasteEvent = useCallback(() => {
    // Brief flash so the user gets visible confirmation that paste
    // was captured. Live validation kicks in immediately after.
    setJustPasted(true);
    window.setTimeout(() => setJustPasted(false), 1500);
  }, []);

  // "Open Kyvern" — silently provisions a Squads vault on the user's
  // wallet if they don't already have one. The vault is the device's
  // budget enforcer; user shouldn't have to think about it. We hide
  // the Squads concept entirely behind the device unboxing.
  const handleContinue = useCallback(async () => {
    if (!wallet) {
      router.push("/app");
      return;
    }
    setProvisioning(true);
    setProvisionError(null);
    try {
      // 1. Resolve the device — existing vault wins, otherwise
      //    create a fresh one. Either way we end up with a deviceId
      //    we can seed workers onto.
      let deviceId: string | null = null;
      const list = await fetch(
        `/api/vault/list?ownerWallet=${encodeURIComponent(wallet)}`,
      );
      const listJson = list.ok ? await list.json() : { vaults: [] };
      const existing = Array.isArray(listJson?.vaults) ? listJson.vaults : [];
      if (existing.length > 0) {
        deviceId = existing[0]?.vault?.id ?? null;
      } else {
        // No vault yet → create with sensible defaults. The user
        // can raise budgets later in /app/settings if they want
        // more headroom for their workers.
        const res = await fetch("/api/vault/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerWallet: wallet,
            name: deriveSerial(wallet).replace("KVN-", "Kyvern "),
            emoji: "🧭",
            purpose: "research",
            dailyLimitUsd: 5,
            weeklyLimitUsd: 25,
            perTxMaxUsd: 0.5,
            maxCallsPerWindow: 60,
            velocityWindow: "1h",
            allowedMerchants: [],
            requireMemo: true,
            network: "devnet",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.message ||
              data?.error ||
              "Vault provisioning failed",
          );
        }
        const created = await res.json();
        deviceId = created?.vault?.id ?? null;
      }

      // 2. Seed the demo trio onto the device — Sentinel/Bounty
      //    Hunter on Superteam Dev >$500, Wren/Whale Tracker on
      //    Kraken hot wallet, Pulse/Token Pulse on SOL band. The
      //    user lands on /app with three workers already running;
      //    the first finding hits within ~90s. Idempotent.
      if (deviceId) {
        await seedDefaultWorkersIfEmpty(deviceId);
      }

      router.push("/app");
    } catch (e) {
      console.warn("[unbox] vault provisioning failed:", e);
      setProvisionError(
        e instanceof Error ? e.message : "Setup failed. Try again.",
      );
      setProvisioning(false);
    }
  }, [wallet, router]);

  // Visual gate helpers — many UI blocks need to stay visible across
  // any post-boot stage (ready / verify / claimed / managed), so we
  // factor it once.
  const postBoot = stage === "ready" || stage === "verify" || stage === "claimed" || stage === "managed";

  return (
    <main
      className="relative flex items-center justify-center px-5 py-10 sm:px-6 sm:py-14 overflow-x-hidden"
      style={{
        // dvh = dynamic viewport height — accounts for iOS Safari's
        // collapsing toolbar so the cinematic doesn't get clipped or
        // pushed under the home indicator.
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse 90% 60% at 50% 50%, #FFFFFF 0%, #F8FAFC 70%, #F1F5F9 100%)",
        color: "#0A0A0A",
      }}
    >
      {/* Faint dot grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15,23,42,0.04) 1px, transparent 1px)",
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
          style={{ color: "rgba(15,23,42,0.55)", fontSize: 10 }}
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
              error={exportError}
              onReveal={handleReveal}
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
              onPaste={handlePasteEvent}
              justPasted={justPasted}
              valid={pasteIsValid}
              wrong={pasteShownButWrong}
              onConfirm={handleConfirmPaste}
              onShowAgain={handleReveal}
              onBypass={handleBypassVerify}
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
              provisioning={provisioning}
              provisionError={provisionError}
            />
          )}
        </AnimatePresence>

        {stage === "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(15,23,42,0.45)" }}
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

  // Geometry — sized to fit a portrait handheld device. The container is
  // tall enough that the device clearing the lid still has air above it.
  //   container: 280×340
  //   box body : 240×170     (sits at the bottom)
  //   box lid  : 240×42      (above the body, hinges at its bottom edge)
  //   device   : 116×190     (portrait — chassis with a real inset screen)
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isOpenStarted}
      className="relative outline-none disabled:cursor-default"
      style={{
        width: 280,
        height: 340,
        perspective: 1100,
      }}
      aria-label="Open the Kyvern box"
    >
      {/* Box body — premium hardware shell, soft brushed register */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-[20px]"
        style={{
          width: 240,
          height: 170,
          bottom: 8,
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F4F6FA 55%, #E9ECF2 100%)",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.85)",
            "inset 0 -8px 16px rgba(15,23,42,0.04)",
            "0 12px 28px rgba(0,0,0,0.06)",
            "0 36px 70px -22px rgba(0,0,0,0.14)",
          ].join(", "),
        }}
        animate={{
          opacity: postBoot ? 0 : 1,
          y: postBoot ? 24 : 0,
        }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {/* Embossed wordmark — only visible on the closed box */}
        <div
          aria-hidden
          className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1"
        >
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.42em",
              color: "rgba(15,23,42,0.32)",
              textShadow: "0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            Kyvern
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 7,
              letterSpacing: "0.32em",
              color: "rgba(15,23,42,0.22)",
            }}
          >
            Solana · devnet
          </span>
        </div>
      </motion.div>

      {/* Box lid — flips up on open. Slight lip overhang so the closed
          box reads as a real fitted-cap container. */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-t-[20px]"
        style={{
          width: 244,
          height: 42,
          bottom: 170 + 8 - 4,
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)",
          border: "1px solid rgba(15,23,42,0.08)",
          borderBottom: "none",
          transformOrigin: "bottom center",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.85), 0 -2px 6px rgba(0,0,0,0.04)",
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
          className="absolute bottom-0 left-3 right-3"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(15,23,42,0.10), transparent)",
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
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              width: 220,
              height: 90,
              bottom: 120,
              background:
                "radial-gradient(closest-side, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 75%)",
              filter: "blur(4px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* THE DEVICE — AI labor appliance. Compute-box register: squat-
          portrait chassis, ventilation grilles down the sides (Mac Studio
          cue), no phone buttons (network-managed), USB-C + policy program
          ID line at the bottom, antenna seam + sensor pinhole at top.
          The "screen" shows three worker status rows — Sentinel · Wren ·
          Pulse running live. That's the tell: this is a device with AI
          labor inside it, not a handheld. */}
      <motion.div
        className="absolute left-1/2"
        style={{
          width: 130,
          height: 164,
          bottom: 30,
          x: "-50%",
        }}
        initial={false}
        animate={
          isOpenStarted
            ? {
                y: stage === "opening" ? -82 : -106,
                opacity: 1,
                scale: stage === "opening" ? 1 : 1.02,
                rotateX: stage === "opening" ? 4 : -2,
                rotateZ: 0,
              }
            : { y: 18, opacity: 0, scale: 0.92, rotateX: 12, rotateZ: -1 }
        }
        transition={{
          duration: 0.95,
          ease: EASE,
          delay: isOpenStarted ? 0.25 : 0,
        }}
      >
        {/* Chassis — brushed aluminum compute appliance */}
        <div
          className="relative w-full h-full rounded-[18px]"
          style={{
            background:
              "linear-gradient(180deg, #FBFBFD 0%, #EEF1F5 50%, #E2E6EE 100%)",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: [
              "inset 0 1px 0 rgba(255,255,255,0.95)",
              "inset 0 -1px 0 rgba(15,23,42,0.05)",
              "inset 1px 0 0 rgba(255,255,255,0.6)",
              "inset -1px 0 0 rgba(15,23,42,0.05)",
              "0 10px 24px rgba(0,0,0,0.10)",
              "0 24px 50px -16px rgba(0,0,0,0.18)",
              "0 0 0 1px rgba(34,197,94,0.10)",
            ].join(", "),
          }}
        >
          {/* Top antenna seam + center pinhole sensor */}
          <div
            aria-hidden
            className="absolute top-1.5 left-3 right-3"
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, rgba(15,23,42,0.10), transparent)",
            }}
          />
          <div
            aria-hidden
            className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: 3,
              height: 3,
              background:
                "radial-gradient(circle at 30% 30%, #2A2F3A 0%, #0A0A0A 70%)",
              boxShadow: "inset 0 0 1px rgba(255,255,255,0.15)",
            }}
          />

          {/* Side ventilation grilles — Mac Studio register. Vertical
              hairline grooves down each edge of the body. */}
          <div
            aria-hidden
            className="absolute"
            style={{
              left: 4,
              top: 36,
              bottom: 32,
              width: 2,
              background:
                "repeating-linear-gradient(to bottom, rgba(15,23,42,0.10) 0 1px, transparent 1px 4px)",
              opacity: 0.7,
            }}
          />
          <div
            aria-hidden
            className="absolute"
            style={{
              right: 4,
              top: 36,
              bottom: 32,
              width: 2,
              background:
                "repeating-linear-gradient(to bottom, rgba(15,23,42,0.10) 0 1px, transparent 1px 4px)",
              opacity: 0.7,
            }}
          />

          {/* Tiny PCB-style screw at the top corners */}
          {[
            { left: 6, top: 6 },
            { right: 6, top: 6 },
          ].map((pos, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute rounded-full"
              style={{
                ...pos,
                width: 3,
                height: 3,
                background:
                  "radial-gradient(circle at 30% 30%, #FFFFFF 0%, #C9CFD8 60%, #8E96A2 100%)",
                boxShadow: "inset 0 0 0 0.5px rgba(15,23,42,0.18)",
              }}
            />
          ))}

          {/* THE SCREEN — inset glass face showing the three workers
              running. Off-state: dark gradient. Awake: three worker
              status rows light up. */}
          <div
            className="absolute rounded-[10px] overflow-hidden"
            style={{
              top: 14,
              left: 10,
              right: 10,
              bottom: 28,
              background:
                stage === "closed" || stage === "opening"
                  ? "linear-gradient(180deg, #14171F 0%, #0A0B10 100%)"
                  : "radial-gradient(120% 100% at 50% 0%, #1B2230 0%, #0A0B10 100%)",
              border: "1px solid rgba(0,0,0,0.55)",
              boxShadow: [
                "inset 0 2px 6px rgba(0,0,0,0.45)",
                "inset 0 0 0 1px rgba(255,255,255,0.04)",
              ].join(", "),
              transition: "background 0.6s ease",
            }}
          >
            {/* Specular reflection — sells the screen as glass */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.04) 100%)",
              }}
            />

            {/* Faint scanline texture for "running display" feel */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)",
                opacity: 0.6,
              }}
            />

            {/* Screen content — three worker status rows. Only renders
                once the device is "awake" (post-opening). */}
            <AnimatePresence>
              {stage !== "closed" && stage !== "opening" && (
                <motion.div
                  key="screen-on"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="absolute inset-0 flex flex-col px-2.5 py-2"
                >
                  {/* Header — KYVERN OS line */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: 6.5,
                        letterSpacing: "0.24em",
                        color: "rgba(134,239,172,0.85)",
                        textShadow: "0 0 6px rgba(134,239,172,0.30)",
                      }}
                    >
                      Kyvern OS
                    </span>
                    <motion.span
                      className="rounded-full"
                      style={{
                        width: 4,
                        height: 4,
                        background: "#22C55E",
                        boxShadow:
                          "0 0 0 1.5px rgba(34,197,94,0.20), 0 0 6px #22C55E",
                      }}
                      animate={{ opacity: [0.55, 1, 0.55] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>

                  {/* Three worker status rows — the "AI labor inside"
                      tell. Each row: status LED · emoji · name · activity
                      tick. Real trio: Sentinel · Wren · Pulse. */}
                  <div className="flex flex-col gap-[3px] flex-1 justify-center">
                    {[
                      { emoji: "🎯", name: "Sentinel", delay: 0 },
                      { emoji: "🐋", name: "Wren", delay: 0.4 },
                      { emoji: "📈", name: "Pulse", delay: 0.8 },
                    ].map((w) => (
                      <div
                        key={w.name}
                        className="flex items-center gap-1.5"
                        style={{ height: 14 }}
                      >
                        <motion.span
                          className="rounded-full"
                          style={{
                            width: 4,
                            height: 4,
                            background: "#22C55E",
                            boxShadow: "0 0 4px rgba(34,197,94,0.6)",
                            flexShrink: 0,
                          }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: w.delay,
                          }}
                        />
                        <span style={{ fontSize: 9, lineHeight: 1 }}>
                          {w.emoji}
                        </span>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 7.5,
                            letterSpacing: "0.04em",
                            color: "rgba(231,233,238,0.85)",
                            flex: 1,
                          }}
                        >
                          {w.name}
                        </span>
                        <motion.span
                          className="font-mono"
                          style={{
                            fontSize: 6.5,
                            letterSpacing: "0.10em",
                            color: "rgba(134,239,172,0.75)",
                          }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: w.delay + 0.2,
                          }}
                        >
                          ●●●
                        </motion.span>
                      </div>
                    ))}
                  </div>

                  {/* Footer — policy program ID stamp */}
                  <div
                    className="font-mono uppercase text-center"
                    style={{
                      fontSize: 5.5,
                      letterSpacing: "0.20em",
                      color: "rgba(231,233,238,0.35)",
                      marginTop: 2,
                    }}
                  >
                    Policy · PpmZ…MSqc
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom edge — USB-C port + power LED + memo of program */}
          <div
            aria-hidden
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: 18,
              height: 4,
              background:
                "linear-gradient(180deg, #0A0B10 0%, #14171F 100%)",
              boxShadow:
                "inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.6)",
            }}
          />
          {/* Power LED — bottom-left, always on */}
          <motion.span
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: 12,
              bottom: 4,
              width: 3,
              height: 3,
              background: "#22C55E",
              boxShadow: "0 0 4px rgba(34,197,94,0.7)",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* AI LABOR DEVICE wordmark — embossed bottom-right */}
          <span
            aria-hidden
            className="absolute font-mono uppercase"
            style={{
              right: 8,
              bottom: 3,
              fontSize: 5,
              letterSpacing: "0.32em",
              color: "rgba(15,23,42,0.30)",
              textShadow: "0 1px 0 rgba(255,255,255,0.85)",
            }}
          >
            AI Labor
          </span>
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
        color: "#0A0A0A",
        textShadow: "0 0 12px rgba(0,0,0,0.05)",
      }}
    >
      {shown}
      {!isDone && (
        <motion.span
          className="inline-block ml-[2px]"
          style={{
            width: 8,
            height: 14,
            background: "#0A0A0A",
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
        color: "rgba(15,23,42,0.45)",
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
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
                background: active ? showColor : "rgba(15,23,42,0.08)",
                boxShadow: active
                  ? `0 0 0 3px ${showColor}26, 0 0 12px ${showColor}40`
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
                color: active ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.40)",
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
  error,
  onReveal,
}: {
  error: string | null;
  onReveal: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="w-full rounded-[16px] px-5 py-5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div className="text-center">
        <div
          className="font-mono uppercase mb-2"
          style={{
            color: "rgba(15,23,42,0.55)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
          }}
        >
          Your device key is ready
        </div>
        <p
          className="text-[13.5px] leading-[1.55] mb-4"
          style={{ color: "rgba(15,23,42,0.78)" }}
        >
          Your Kyvern device is a Solana wallet. The key below is the
          only way to recover it. <strong style={{ color: "#0A0A0A" }}>We can&apos;t recover it for you.</strong>
        </p>

        <motion.button
          type="button"
          onClick={onReveal}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 h-[48px] px-6 rounded-[12px] text-[13.5px] font-semibold tracking-[-0.005em]"
          style={{
            background: "#0A0A0A",
            color: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.8)",
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          <Eye className="w-4 h-4" strokeWidth={1.8} />
          Reveal device key
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

        <p
          className="mt-4 font-mono"
          style={{
            fontSize: 10,
            color: "rgba(15,23,42,0.45)",
            letterSpacing: "0.06em",
          }}
        >
          A Privy modal will open with your key. Copy it, then close
          the modal to verify.
        </p>
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
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="font-mono uppercase mb-2"
        style={{
          color: "rgba(15,23,42,0.55)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
        }}
      >
        Managed by {walletLabel}
      </div>
      <p
        className="text-[13.5px] leading-[1.55] mb-4"
        style={{ color: "rgba(15,23,42,0.78)" }}
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
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.8)",
          boxShadow:
            "0 4px 14px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.08)",
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
  onPaste,
  justPasted,
  valid,
  wrong,
  onConfirm,
  onShowAgain,
  onBypass,
}: {
  pasted: string;
  onChange: (s: string) => void;
  onPaste: () => void;
  justPasted: boolean;
  valid: boolean;
  wrong: boolean;
  onConfirm: () => void;
  onShowAgain: () => void;
  onBypass: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="w-full rounded-[16px] px-5 py-5"
      style={{
        background: "#FFFFFF",
        border: valid
          ? "1px solid rgba(34,197,94,0.45)"
          : wrong
            ? "1px solid rgba(245,158,11,0.45)"
            : "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="font-mono uppercase mb-2 text-center"
        style={{
          color: valid ? "#22C55E" : "rgba(15,23,42,0.55)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
        }}
      >
        {valid
          ? "Match — your device is yours"
          : justPasted
            ? "Key captured · checking…"
            : "Confirm you saved it"}
      </div>
      <p
        className="text-[13.5px] leading-[1.55] mb-3 text-center"
        style={{ color: "rgba(15,23,42,0.78)" }}
      >
        Paste your device key here to prove you&apos;ve got it.
      </p>

      <textarea
        value={pasted}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        placeholder="Paste base58 device key…"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        rows={3}
        className="w-full font-mono text-[13px] leading-[1.4] outline-none resize-none rounded-[10px] px-3 py-3"
        style={{
          background: "#FAFAFA",
          color: "#0A0A0A",
          border: justPasted
            ? "1px solid rgba(34,197,94,0.45)"
            : "1px solid rgba(15,23,42,0.12)",
          letterSpacing: "0.01em",
          transition: "border-color 0.3s ease",
          // Belt-and-suspenders: explicit text selection so iOS
          // Safari's long-press paste menu always shows up here,
          // even if any ancestor sets user-select.
          userSelect: "text",
          WebkitUserSelect: "text",
        }}
      />

      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <button
          type="button"
          onClick={onShowAgain}
          className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] hover:underline min-h-[36px] px-1.5"
          style={{
            fontSize: 10.5,
            color: "rgba(15,23,42,0.65)",
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
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em] disabled:cursor-not-allowed"
          style={{
            background: valid ? "#22C55E" : "#FFFFFF",
            color: valid ? "#FFFFFF" : "rgba(15,23,42,0.45)",
            border: valid ? "none" : "1px solid rgba(15,23,42,0.10)",
            boxShadow: valid
              ? "0 6px 16px rgba(34,197,94,0.35)"
              : "0 1px 2px rgba(0,0,0,0.04)",
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

      {/* Last-resort bypass — for the case where Privy's modal won't
          open at all (dashboard misconfig, popup blocker, etc.) and
          the user can't get their key into the textarea. They can
          still use Kyvern; their wallet stays recoverable via account. */}
      <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}>
        <button
          type="button"
          onClick={onBypass}
          className="font-mono uppercase tracking-[0.16em] hover:underline min-h-[40px] px-2 inline-flex items-center justify-center"
          style={{
            fontSize: 10.5,
            color: "rgba(15,23,42,0.55)",
          }}
        >
          Modal not opening? Continue without saving
        </button>
      </div>
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
  provisioning,
  provisionError,
}: {
  variant: "claimed" | "managed";
  walletLabel: string;
  onContinue: () => void;
  provisioning: boolean;
  provisionError: string | null;
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
          "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)",
        border: "1px solid rgba(34,197,94,0.30)",
        boxShadow:
          "0 8px 28px rgba(0,0,0,0.08), 0 0 0 4px rgba(34,197,94,0.06)",
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
        style={{ color: "#0A0A0A" }}
      >
        Your device is yours.
      </h2>
      <p
        className="text-[13px] leading-[1.55] mb-4"
        style={{ color: "rgba(15,23,42,0.72)" }}
      >
        {isManaged
          ? `Signed in via ${walletLabel}. Your workers are waiting.`
          : "Your key is yours alone. Time to spawn your first worker."}
      </p>

      <motion.button
        type="button"
        onClick={onContinue}
        disabled={provisioning}
        whileHover={provisioning ? undefined : { y: -1 }}
        whileTap={provisioning ? undefined : { scale: 0.98 }}
        className="inline-flex items-center gap-2 h-[48px] px-6 rounded-[12px] text-[13.5px] font-semibold tracking-[-0.005em] disabled:cursor-wait"
        style={{
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.8)",
          boxShadow:
            "0 4px 14px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.08)",
          opacity: provisioning ? 0.85 : 1,
        }}
      >
        {provisioning ? (
          <>
            <motion.span
              className="w-3.5 h-3.5 border-2 rounded-full"
              style={{
                borderColor: "rgba(255,255,255,0.18)",
                borderTopColor: "#FFFFFF",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
            Provisioning device + 3 starter workers…
          </>
        ) : (
          <>
            Open Kyvern
            <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
          </>
        )}
      </motion.button>

      {provisionError && (
        <div
          className="mt-3 font-mono"
          style={{
            fontSize: 11,
            color: "#F59E0B",
            letterSpacing: "0.04em",
          }}
        >
          {provisionError}
        </div>
      )}
    </motion.div>
  );
}
