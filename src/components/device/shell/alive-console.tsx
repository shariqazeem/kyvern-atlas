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
import { ArrowRight, Code2, ShieldAlert, ShieldCheck, Terminal, X } from "lucide-react";
import { WorkerTemplates } from "../worker/worker-templates";
import {
  UserVaultCard,
  PolicyRibbon,
  StatsGrid,
  Allowlist,
  HeistOverlay,
  SecureTerminal,
  type VaultPayload,
} from "../worker/user-vault-card";
import { PayShFlow } from "../worker/paysh-flow";
import { VaultStrip, type VaultTileData } from "../worker/vault-strip";
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
  const [vaults, setVaults] = useState<VaultTileData[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(
    vaultId,
  );

  // Default selection to the primary vault when it first arrives
  useEffect(() => {
    if (!selectedVaultId && vaultId) setSelectedVaultId(vaultId);
  }, [vaultId, selectedVaultId]);

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

  // Load the SELECTED vault's payload + poll
  const load = useCallback(async () => {
    const targetId = selectedVaultId ?? vaultId;
    if (!targetId) return;
    try {
      const r = await fetch(`/api/vault/${targetId}?limit=20`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = (await r.json()) as VaultPayload;
      setData(d);
    } catch {
      /* swallow */
    }
  }, [selectedVaultId, vaultId]);
  useEffect(() => {
    void load();
    const targetId = selectedVaultId ?? vaultId;
    if (!targetId) return;
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load, selectedVaultId, vaultId]);

  // Reset detail data when switching vaults so the worker card shows
  // a skeleton briefly instead of flashing the previous vault's data.
  useEffect(() => {
    setData(null);
  }, [selectedVaultId]);

  // Poll the user's vault list for the strip
  useEffect(() => {
    if (!ownerWallet) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(
          `/api/vault/list?ownerWallet=${encodeURIComponent(ownerWallet)}`,
          { cache: "no-store" },
        );
        if (!r.ok) return;
        const d = (await r.json()) as {
          vaults?: Array<{
            vault: {
              id: string;
              name: string;
              network: "devnet" | "mainnet";
              pausedAt: string | null;
            };
          }>;
        };
        if (!alive) return;
        const tiles: VaultTileData[] = (d.vaults ?? []).map((v) => ({
          id: v.vault.id,
          name: v.vault.name,
          network: v.vault.network ?? "devnet",
          paused: !!v.vault.pausedAt,
          lastCallRel: null, // populated lazily when this vault is selected
        }));
        setVaults(tiles);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [ownerWallet]);

  // When the currently-selected vault has fresh payment data, mirror
  // its latest call timestamp onto the tile so the strip stays in sync.
  useEffect(() => {
    if (!data) return;
    const latest = data.payments[0]?.createdAt;
    if (!latest) return;
    const relCall = (() => {
      const ms = Date.parse(
        typeof latest === "string" && !latest.includes("T")
          ? latest.replace(" ", "T") + "Z"
          : String(latest),
      );
      if (isNaN(ms)) return null;
      const diff = Date.now() - ms;
      if (diff < 5_000) return "just now";
      if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
      return `${Math.floor(diff / 3_600_000)}h ago`;
    })();
    setVaults((prev) =>
      prev.map((v) =>
        v.id === data.vault.id ? { ...v, lastCallRel: relCall } : v,
      ),
    );
  }, [data]);

  return (
    <div className={`flex flex-col gap-4 sm:gap-5 ${className ?? ""}`}>
      {/* Vault strip — Atlas + user vaults + Deploy CTA. The horizontal
          row sits above the worker card; click a user vault to switch
          the integration panel below to its data. */}
      <VaultStrip
        vaults={vaults}
        selectedVaultId={selectedVaultId}
        onSelect={setSelectedVaultId}
      />

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
                Your worker can earn and spend on Solana — within rules the
                chain enforces.
              </span>{" "}
              <span style={{ color: "rgba(15,23,42,0.65)" }}>
                Click any scenario in the worker card above to see the chain
                refuse a violation in real time. Add merchants in{" "}
                <span style={{ fontWeight: 600 }}>Policy → Add</span> below.
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

      {/* Hero: USER's vault Worker Card. Tabs removed — integration
          wizard mounts inside the card; policy + pay.sh live as
          separate cards below. */}
      {data ? (
        <UserVaultCard data={data} ownerWallet={ownerWallet} now={now} />
      ) : (
        <UserVaultSkeleton />
      )}

      {/* First-time orientation only — hidden once the user has a vault. */}
      {!data && <WorkerTemplates />}

      {/* Policy + Allowlist card — caps, stats, merchant editor */}
      {data && (
        <SectionCard>
          <SectionHeader
            eyebrow="Policy"
            title="Enforced on-chain"
            subtitle="Every payment validates against these rules before USDC moves."
          />
          <div className="flex flex-col gap-5">
            <PolicyRibbon budget={data.budget} />
            <StatsGrid vault={data.vault} payments={data.payments} />
            <Allowlist
              merchants={data.vault.allowedMerchants}
              vaultId={data.vault.id}
              ownerWallet={data.vault.ownerWallet ?? ownerWallet}
            />
          </div>
        </SectionCard>
      )}

      {/* Network · Pay.sh interception card */}
      {data && (
        <SectionCard>
          <PayShFlow
            vaultId={data.vault.id}
            ownerWallet={data.vault.ownerWallet ?? ownerWallet}
          />
        </SectionCard>
      )}

      {/* Footer: interactive demos + developer mode */}
      {data && (
        <DemosFooter
          vaultId={data.vault.id}
          ownerWallet={data.vault.ownerWallet ?? ownerWallet}
          perTxMaxUsd={data.budget.perTxMaxUsd}
          network={data.vault.network}
        />
      )}
    </div>
  );
}

/* ─── Section primitives ─────────────────────────────────────────── */

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
      className="rounded-[20px] p-5 sm:p-6 flex flex-col gap-4"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 16px 40px -24px rgba(15,23,42,0.12)",
      }}
    >
      {children}
    </motion.section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="font-mono uppercase tracking-[0.18em]"
        style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
      >
        {eyebrow}
      </span>
      <h3
        className="text-[16px] font-semibold tracking-[-0.01em]"
        style={{ color: "#0A0A0A" }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="text-[12.5px] mt-0.5"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ─── Demos footer (Heist + Secure Terminal as small links) ─────── */

function DemosFooter({
  vaultId,
  ownerWallet,
  perTxMaxUsd,
  network,
}: {
  vaultId: string;
  ownerWallet: string | null;
  perTxMaxUsd: number;
  network: "devnet" | "mainnet";
}) {
  const [heistOpen, setHeistOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        className="flex items-center justify-center gap-2 flex-wrap pt-1"
      >
        <Link
          href="/app/developer"
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:bg-[rgba(15,23,42,0.04)]"
        >
          <Code2
            className="w-3 h-3"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Developer mode
          </span>
          <ArrowRight
            className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
        </Link>

        <span
          style={{
            width: 1,
            height: 14,
            background: "rgba(15,23,42,0.10)",
          }}
        />

        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
        >
          Interactive demos
        </span>

        <button
          type="button"
          onClick={() => ownerWallet && setTerminalOpen(true)}
          disabled={!ownerWallet}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)] disabled:opacity-50"
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        >
          <Terminal
            className="w-3 h-3"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
          <span
            className="text-[11px]"
            style={{ color: "rgba(15,23,42,0.65)" }}
          >
            Secure Terminal
          </span>
        </button>

        <button
          type="button"
          onClick={() => ownerWallet && setHeistOpen(true)}
          disabled={!ownerWallet}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)] disabled:opacity-50"
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        >
          <ShieldAlert
            className="w-3 h-3"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
          <span
            className="text-[11px]"
            style={{ color: "rgba(15,23,42,0.65)" }}
          >
            Watch the chain refuse
          </span>
        </button>
      </motion.div>

      <HeistOverlay
        open={heistOpen}
        onClose={() => setHeistOpen(false)}
        vaultId={vaultId}
        ownerWallet={ownerWallet}
        perTxMaxUsd={perTxMaxUsd}
        network={network}
      />
      <SecureTerminal
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        vaultId={vaultId}
        ownerWallet={ownerWallet}
        network={network}
      />
    </>
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
