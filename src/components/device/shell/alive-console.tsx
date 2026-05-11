"use client";

/**
 * AliveConsole — /app's mission-control stage.
 *
 * The user's signed-in surface. After the 2026-05-10 swap, the hero
 * is the user's OWN vault as a Worker Card (not Atlas). Atlas is
 * demoted to a small reference strip — still the inevitability proof,
 * but no longer the protagonist on the user's device.
 *
 * Layout, top-to-bottom:
 *   1. Whisper line
 *   2. <UserVaultCard> — hero, mounted with the user's primary vault
 *   3. <AtlasReferenceStrip> — one-line callout to /atlas
 *   4. <WorkerTemplates> — provision-vault + roadmap cards
 *   5. Developer mode link
 *
 * Data: /api/vault/[id] for the user's vault (same endpoint as the
 * per-vault page). Polls every 5s.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Code2, ShieldCheck, X } from "lucide-react";
import { WorkerTemplates } from "../worker/worker-templates";
import {
  UserVaultCard,
  type VaultPayload,
} from "../worker/user-vault-card";
import type { PanelKind } from "../home/affordance-row";

const ORIENT_BANNER_KEY = "kyvern:orient-allowlist-dismissed";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
  agentKeyPrefix: string | null;
  usdcBalance: number;
  paused?: boolean;
  network?: "devnet" | "mainnet";
  onTileClick?: (panel: PanelKind) => void;
  className?: string;
}

export function AliveConsole({ vaultId, ownerWallet, className }: Props) {
  const [data, setData] = useState<VaultPayload | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [bannerDismissed, setBannerDismissed] = useState(true);

  // First-visit allowlist orientation banner. Only renders when:
  //   (a) the user has a vault (so it's not a cold-start screen)
  //   (b) the vault has exactly the 3 default merchants (untouched)
  //   (c) the dismissed flag isn't set in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(ORIENT_BANNER_KEY);
    setBannerDismissed(!!dismissed);
  }, []);
  const showOrientBanner =
    !bannerDismissed &&
    !!data &&
    data.payments.length === 0 &&
    data.vault.allowedMerchants.length <= 3;
  const dismissBanner = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ORIENT_BANNER_KEY, "1");
    }
    setBannerDismissed(true);
  }, []);

  // Local clock — drives "last call 17s ago" + age timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load user's vault payload + poll
  const load = useCallback(async () => {
    if (!vaultId) return;
    try {
      const r = await fetch(`/api/vault/${vaultId}?limit=20`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = (await r.json()) as VaultPayload;
      setData(d);
    } catch {
      /* swallow */
    }
  }, [vaultId]);
  useEffect(() => {
    void load();
    if (!vaultId) return;
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load, vaultId]);

  return (
    <div className={`flex flex-col gap-4 sm:gap-5 ${className ?? ""}`}>
      {/* First-visit orientation banner — surfaces the allowlist
          editor for fresh vaults so SDK developers see they can
          declare their merchants without re-provisioning. */}
      <AnimatePresence>
        {showOrientBanner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex items-center gap-3 rounded-[12px] px-4 py-2.5"
            style={{
              background:
                "linear-gradient(180deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            <ShieldCheck
              className="w-4 h-4 flex-shrink-0"
              strokeWidth={2}
              style={{ color: "#15803D" }}
            />
            <div className="flex-1 min-w-0 text-[12px] leading-[1.5]">
              <span style={{ color: "#0A0A0A", fontWeight: 500 }}>
                Your worker is provisioned with 3 default merchants.
              </span>{" "}
              <span style={{ color: "rgba(15,23,42,0.65)" }}>
                Add your own in{" "}
                <span style={{ fontWeight: 600 }}>Rules → Add</span> — the
                policy program enforces every merchant before USDC moves.
              </span>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="inline-flex items-center justify-center rounded-md transition-all hover:bg-[rgba(15,23,42,0.06)]"
              style={{
                width: 22,
                height: 22,
                color: "rgba(15,23,42,0.45)",
              }}
            >
              <X className="w-3 h-3" strokeWidth={2.2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero: USER's vault Worker Card. Tabbed device shell —
          Runtime / Network / Rules. Live-tape always visible above
          the tabs (the constant motion signal). */}
      {data ? (
        <UserVaultCard data={data} ownerWallet={ownerWallet} now={now} />
      ) : (
        <UserVaultSkeleton />
      )}

      {/* First-time orientation only — hidden once the user has a vault. */}
      {!data && <WorkerTemplates />}

      {/* Developer mode link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        className="flex items-center justify-center pt-1"
      >
        <Link
          href="/app/developer"
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-[rgba(15,23,42,0.04)]"
        >
          <Code2
            className="w-3.5 h-3.5"
            style={{ color: "rgba(15,23,42,0.55)" }}
            strokeWidth={2}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Developer mode
          </span>
          <span
            className="text-[11.5px]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            mint key · install SDK · run a chain-enforced payment
          </span>
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: "rgba(15,23,42,0.55)" }}
            strokeWidth={2}
          />
        </Link>
      </motion.div>
    </div>
  );
}

function UserVaultSkeleton() {
  return (
    <div
      className="relative w-full"
      style={{
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.06)",
        minHeight: 420,
      }}
    >
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-[14px]"
            style={{ background: "rgba(15,23,42,0.05)" }}
          />
          <div className="flex flex-col gap-2 flex-1">
            <div
              className="h-5 rounded w-32"
              style={{ background: "rgba(15,23,42,0.05)" }}
            />
            <div
              className="h-3 rounded w-48"
              style={{ background: "rgba(15,23,42,0.04)" }}
            />
          </div>
        </div>
        <div
          className="h-20 rounded-[14px]"
          style={{ background: "rgba(15,23,42,0.04)" }}
        />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-[12px]"
              style={{ background: "rgba(15,23,42,0.03)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
