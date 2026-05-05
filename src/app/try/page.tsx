"use client";

/**
 * /try — guest sandbox. Zero-friction onboarding for judges + curious
 * builders who don't want to sign in to Privy.
 *
 * Flow:
 *   1. Generate (or reuse) a synthetic Solana wallet stored in
 *      localStorage as `kyvern:dev-wallet`. Same key /app's
 *      devWallet() fallback already reads, so once we plant it,
 *      /app picks it up like any logged-in user.
 *   2. POST /api/vault/create with that synthetic wallet → real
 *      Squads multisig + Kyvern policy program on devnet. This is
 *      the same call /unbox makes; the only difference is no Privy
 *      embedded wallet.
 *   3. seedDefaultWorkersIfEmpty(deviceId) — pre-installs Sentinel /
 *      Wren / Pulse so the visitor lands inside a living device.
 *   4. router.push('/app').
 *
 * No top-up. The drain attempt + key minting work on $0 vault. If
 * the visitor wants to see "Buy signal · settled green", they hit
 * the Top up FAB and use the Circle faucet — same as a real user.
 *
 * Nothing precious is created — guest devices are real on-chain
 * artifacts, but the synthetic wallet has no private key the user
 * holds, so they can't withdraw. It's a sandbox, not a wallet.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { seedDefaultWorkersIfEmpty } from "@/lib/onboarding/seed-workers";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STAGES = [
  "Spinning up your sandbox device…",
  "Provisioning a Squads multisig vault on Solana devnet…",
  "Wiring the Kyvern policy program (PpmZ…MSqc)…",
  "Installing the three starter workers…",
];

export default function TryPage() {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void provisionGuestDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function provisionGuestDevice() {
    try {
      // 1. Synthetic wallet — same shape /app's devWallet() fallback
      //    expects. If one already exists in localStorage, reuse it
      //    so refreshing /try doesn't multiply devices.
      const wallet = getOrCreateGuestWallet();

      setStage(0);
      // 2. Look up an existing vault for this synthetic wallet first.
      const list = await fetch(
        `/api/vault/list?ownerWallet=${encodeURIComponent(wallet)}`,
      );
      const listJson = list.ok ? await list.json() : { vaults: [] };
      const existing = Array.isArray(listJson?.vaults) ? listJson.vaults : [];
      let deviceId: string | null =
        existing.length > 0 ? (existing[0]?.vault?.id ?? null) : null;

      if (!deviceId) {
        setStage(1);
        const serial = `Kyvern-Guest-${wallet.slice(0, 4)}`;
        const res = await fetch("/api/vault/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerWallet: wallet,
            name: serial,
            emoji: "🧭",
            purpose: "sandbox",
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
            data?.message || data?.error || "Vault provisioning failed",
          );
        }
        const created = await res.json();
        deviceId = created?.vault?.id ?? null;
      }

      setStage(2);
      // Brief pause so the UI doesn't flash through stages too fast.
      await new Promise((r) => setTimeout(r, 600));

      setStage(3);
      if (deviceId) {
        await seedDefaultWorkersIfEmpty(deviceId);
      }

      // 3. Hand off to /app — devWallet() picks up the same wallet.
      router.replace("/app");
    } catch (e) {
      console.warn("[try] guest provisioning failed:", e);
      setError(e instanceof Error ? e.message : "Setup failed.");
    }
  }

  return (
    <main
      className="relative flex items-center justify-center px-5 py-10 sm:px-6 sm:py-14"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse 90% 60% at 50% 50%, #FFFFFF 0%, #F8FAFC 70%, #F1F5F9 100%)",
        color: "#0A0A0A",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-[420px] flex flex-col items-center text-center"
      >
        <div
          className="w-[64px] h-[64px] rounded-[18px] mb-5 flex items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 24px -10px rgba(15,23,42,0.10)",
          }}
        >
          <ShieldCheck
            className="w-7 h-7"
            strokeWidth={1.6}
            style={{ color: "#15803D" }}
          />
        </div>

        <span
          className="font-mono uppercase tracking-[0.18em] mb-2"
          style={{ color: "rgba(15,23,42,0.55)", fontSize: 10 }}
        >
          Sandbox · no login
        </span>

        <h1
          className="text-[26px] font-semibold tracking-[-0.02em] mb-2"
          style={{ color: "#0A0A0A" }}
        >
          Provisioning your Kyvern.
        </h1>
        <p
          className="text-[13.5px] leading-[1.55] mb-6"
          style={{ color: "#475569" }}
        >
          A real Solana device — multisig vault, Anchor policy program,
          three starter workers. No keys to manage. Yours to break.
        </p>

        {!error ? (
          <ul className="w-full flex flex-col gap-2 text-left">
            {STAGES.map((s, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li
                  key={s}
                  className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
                  style={{
                    background: active
                      ? "rgba(34,197,94,0.06)"
                      : done
                        ? "#FFFFFF"
                        : "transparent",
                    border: active
                      ? "1px solid rgba(34,197,94,0.25)"
                      : "1px solid rgba(15,23,42,0.06)",
                    transition: "all 0.3s ease",
                    opacity: done || active ? 1 : 0.45,
                  }}
                >
                  {done ? (
                    <span
                      className="rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: "#22C55E",
                        flexShrink: 0,
                        boxShadow: "0 0 0 3px rgba(34,197,94,0.18)",
                      }}
                    />
                  ) : active ? (
                    <Loader2
                      className="w-4 h-4 animate-spin flex-shrink-0"
                      strokeWidth={2}
                      style={{ color: "#15803D" }}
                    />
                  ) : (
                    <span
                      className="rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: "rgba(15,23,42,0.18)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span
                    className="text-[12.5px]"
                    style={{
                      color: done
                        ? "rgba(15,23,42,0.50)"
                        : active
                          ? "#0A0A0A"
                          : "rgba(15,23,42,0.55)",
                    }}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div
            className="w-full rounded-[12px] px-4 py-3 text-left"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.30)",
            }}
          >
            <div
              className="font-mono uppercase tracking-[0.16em] mb-1.5"
              style={{ color: "#B45309", fontSize: 10 }}
            >
              Sandbox setup hiccup
            </div>
            <p
              className="text-[12.5px] leading-[1.55] mb-3"
              style={{ color: "#92400E" }}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStage(0);
                void provisionGuestDevice();
              }}
              className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] rounded-full px-3 py-1 transition active:scale-[0.97]"
              style={{
                fontSize: 10,
                color: "#FFFFFF",
                background: "#0A0A0A",
                border: "1px solid rgba(0,0,0,0.8)",
              }}
            >
              Try again
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        )}
      </motion.div>
    </main>
  );
}

/** Same shape as /app's devWallet() fallback — base58-ish 44 chars
 *  stored under `kyvern:dev-wallet`. Returning the same value across
 *  visits lets a returning judge resume their sandbox device. */
function getOrCreateGuestWallet(): string {
  if (typeof window === "undefined") return "";
  const KEY = "kyvern:dev-wallet";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const a =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(KEY, s);
  return s;
}
