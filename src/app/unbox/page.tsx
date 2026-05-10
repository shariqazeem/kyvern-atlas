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
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePrivy } from "@privy-io/react-auth";

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

/* verifyDeviceKey + the paste-back ceremony retired 2026-05-09.
 * One-screen unbox now goes closed → opening → serial → boot →
 * claimed without ever surfacing the device key. */

function deriveSerial(wallet: string | null): string {
  if (!wallet) return "KVN-________";
  return `KVN-${wallet.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

export default function UnboxPage() {
  const router = useRouter();
  const { wallet, isAuthenticated, isLoading } = useAuth();
  const { user } = usePrivy();
  const [stage, setStage] = useState<Stage>("closed");
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

  const externalWalletLabel = useMemo(() => {
    if (!walletClientType) return "your wallet";
    return walletClientType.charAt(0).toUpperCase() + walletClientType.slice(1);
  }, [walletClientType]);

  const serial = useMemo(() => deriveSerial(wallet), [wallet]);

  const openBox = useCallback(() => {
    if (stage !== "closed") return;
    setStage("opening");
    // One-screen unbox per the new theme — drop the device-key
    // reveal/paste ceremony and the worker-list "ready" state. Go
    // closed → opening → serial → boot → claimed (final card with
    // "Open Kyvern" CTA). Total cinematic ~2.3s + one click → /app.
    window.setTimeout(() => setStage("serial"), 700);
    window.setTimeout(() => setStage("boot"), 700 + serial.length * 50 + 80);
    window.setTimeout(
      () => setStage("claimed"),
      700 + serial.length * 50 + 80 + 1100,
    );
  }, [stage, serial.length]);

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
      //    create a fresh one. We don't actually need the resulting
      //    deviceId locally anymore (auto-seeding the legacy trio
      //    was retired in v1.1 — see note below). The /vault/create
      //    response is awaited so we know it succeeded before we
      //    redirect; that's all.
      const list = await fetch(
        `/api/vault/list?ownerWallet=${encodeURIComponent(wallet)}`,
      );
      const listJson = list.ok ? await list.json() : { vaults: [] };
      const existing = Array.isArray(listJson?.vaults) ? listJson.vaults : [];
      if (existing.length === 0) {
        // No vault yet → create with sensible defaults. The user
        // can raise budgets later in /app/settings if they want
        // more headroom for their agents.
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
      }

      // Auto-seed retired as of v1.1 — the legacy Sentinel/Wren/Pulse
      // trio was emitting Pulse "SOL hit $X" signals into new users'
      // inboxes alongside their own graph agents, which conflated two
      // unrelated narratives. New users now land on an empty canvas and
      // compose their own agents from the recipe gallery. The legacy
      // trio + Atlas continue to run for the existing pre-v1.1 vaults
      // that already have them.

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

        {/* The reveal/paste ritual was retired — boot now lands
            straight on the claimed card. Embedded vs external wallet
            still surfaces the right wallet label on the final card,
            but no key reveal happens. */}

        {/* CLAIMED — final success card */}
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

                  {/* Three status rows — the "device is alive" tell.
                      No more worker theatre; matches the new
                      integration-console story (vault · policy ·
                      network). Each row: pulsing LED · label · ready
                      pill. */}
                  <div className="flex flex-col gap-[3px] flex-1 justify-center">
                    {[
                      { label: "vault", delay: 0 },
                      { label: "policy", delay: 0.35 },
                      { label: "devnet", delay: 0.7 },
                    ].map((row) => (
                      <div
                        key={row.label}
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
                            delay: row.delay,
                          }}
                        />
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 7.5,
                            letterSpacing: "0.04em",
                            color: "rgba(231,233,238,0.85)",
                            flex: 1,
                          }}
                        >
                          {row.label}
                        </span>
                        <motion.span
                          className="font-mono uppercase"
                          style={{
                            fontSize: 6.5,
                            letterSpacing: "0.14em",
                            color: "rgba(134,239,172,0.75)",
                          }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: row.delay + 0.2,
                          }}
                        >
                          ready
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
   SerialStamp — typewriter for KVN-XXXXXXXX. ~50ms per char (quick).
   ──────────────────────────────────────────────────────────────────── */

function SerialStamp({ text }: { text: string }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 50);
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
   LedBoot — three dots: auth → vault → ready. Each ~500ms (quick).
   ──────────────────────────────────────────────────────────────────── */

function LedBoot({ stageReady }: { stageReady: boolean }) {
  const [step, setStep] = useState(stageReady ? 3 : 0);

  useEffect(() => {
    if (stageReady) {
      setStep(3);
      return;
    }
    const t1 = window.setTimeout(() => setStep(1), 0);
    const t2 = window.setTimeout(() => setStep(2), 370);
    const t3 = window.setTimeout(() => setStep(3), 740);
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

/* RevealCard / ManagedCard / VerifyCard removed — the unbox no longer reveals or verifies a device key. The components stayed historically as backup but were dropped 2026-05-09 when the cinematic was tightened to one screen. */

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
        {isManaged ? "Welcome back" : "Vault · Policy · Devnet ready"}
      </div>
      <h2
        className="text-[20px] font-semibold tracking-[-0.015em] mb-3"
        style={{ color: "#0A0A0A" }}
      >
        Your device is ready.
      </h2>
      <p
        className="text-[13px] leading-[1.55] mb-4"
        style={{ color: "rgba(15,23,42,0.72)" }}
      >
        {isManaged
          ? `Signed in via ${walletLabel}. Your live integration console is waiting.`
          : "Squads vault provisioned. Policy program enforcing every dollar. Open the device to mint a key + walk the 5-step integration."}
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
