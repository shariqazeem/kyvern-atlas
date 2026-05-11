"use client";

/**
 * AliveConsole — /app canvas. Apple-feel rebuild (P12.25).
 *
 * Structure (top → bottom):
 *   1. Hero band (2-col) — Worker identity + Vault balance
 *   2. Three-column grid:
 *      LEFT  (280px): Workers sidebar (Atlas + user vaults + Deploy)
 *      MID   (1fr):   Runtime status · SDK Xcode card · Recent calls
 *      RIGHT (320px): Policy · Watch the chain refuse · Pay.sh flow
 *   3. Wire your agent — full-width steps card
 *   4. Footer — interactive demo pills
 *
 * Colors stay on our brand (greens + ink #0A0A0A). The design's
 * Apple-blue accent maps to our green.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Plus,
  ShieldAlert,
  Terminal,
  Wallet,
} from "lucide-react";
import { KyvernMark } from "@/components/brand/kyvern-mark";
import { TopUpDrawer } from "@/components/device/top-up-drawer";
import { WorkerTemplates } from "../worker/worker-templates";
import {
  PolicyRibbon,
  Allowlist,
  HeistOverlay,
  SecureTerminal,
  ScenarioPanel,
  deriveSerial,
  type VaultPayload,
} from "../worker/user-vault-card";
import { IntegrationWizard } from "../wizard/integration-wizard";
import { PayShFlow } from "../worker/paysh-flow";
import type { PanelKind } from "../home/affordance-row";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* Design tokens — matched to landing page (#FAFAFA bg, ink #0A0A0A) */
const TOK = {
  surface: "#FFFFFF",
  surface2: "#F6F6F7",
  bg: "#FAFAFA",
  hairline: "rgba(0,0,0,0.08)",
  hairline2: "rgba(0,0,0,0.05)",
  ink: "#0A0A0A",
  ink2: "#374151",
  ink3: "#475569",
  ink4: "#6B7280",
  ink5: "#9CA3AF",
  green: "#15803D",
  greenSoft: "rgba(22,163,74,0.10)",
  greenLine: "rgba(22,163,74,0.22)",
  greenPress: "#166534",
  amber: "#B45309",
  amberSoft: "rgba(180,83,9,0.08)",
  amberLine: "rgba(180,83,9,0.20)",
  red: "#DC2626",
  shadowCard:
    "0 1px 1.5px rgba(0,0,0,0.03), 0 8px 24px -10px rgba(0,0,0,0.06)",
  shadowHi:
    "0 1px 2px rgba(0,0,0,0.04), 0 18px 40px -16px rgba(0,0,0,0.10)",
};

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

interface VaultTile {
  id: string;
  name: string;
  network: "devnet" | "mainnet";
  paused: boolean;
  lastCallRel: string | null;
}

interface AtlasStatus {
  totalSettled: number;
  totalAttacksBlocked: number;
  uptimeMs: number;
  running: boolean;
}

export function AliveConsole({
  vaultId,
  ownerWallet,
  usdcBalance,
  className,
}: Props) {
  const [data, setData] = useState<VaultPayload | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [vaults, setVaults] = useState<VaultTile[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(
    vaultId,
  );
  const [atlas, setAtlas] = useState<AtlasStatus | null>(null);

  useEffect(() => {
    if (!selectedVaultId && vaultId) setSelectedVaultId(vaultId);
  }, [vaultId, selectedVaultId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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

  useEffect(() => {
    setData(null);
  }, [selectedVaultId]);

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
        const tiles: VaultTile[] = (d.vaults ?? []).map((v) => ({
          id: v.vault.id,
          name: v.vault.name,
          network: v.vault.network ?? "devnet",
          paused: !!v.vault.pausedAt,
          lastCallRel: null,
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

  /* Atlas counters for the reference workers tile */
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/status", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as AtlasStatus;
        if (alive) setAtlas(d);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 8_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const latest = data.payments[0]?.createdAt;
    if (!latest) return;
    const rel = (() => {
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
        v.id === data.vault.id ? { ...v, lastCallRel: rel } : v,
      ),
    );
  }, [data]);

  const resolvedOwner = data?.vault.ownerWallet ?? ownerWallet;

  if (!data) {
    return (
      <div className={`flex flex-col gap-4 ${className ?? ""}`}>
        <SkeletonHero />
        {!data && <WorkerTemplates />}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-6 ${className ?? ""}`}
      style={{ color: TOK.ink }}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)] gap-5">
        <WorkerIdentityHero data={data} now={now} />
        <VaultBalanceHero data={data} usdcBalance={usdcBalance} />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ MAIN GRID ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-5 items-start">
        {/* LEFT — Workers sidebar */}
        <WorkersSidebar
          vaults={vaults}
          selectedVaultId={selectedVaultId}
          onSelect={setSelectedVaultId}
          atlas={atlas}
        />

        {/* CENTER — Runtime · SDK · Recent calls */}
        <div className="flex flex-col gap-5 min-w-0">
          <RuntimeCard data={data} />
          <SdkXcodeCard vaultId={data.vault.id} />
          <OracleAgentCard
            vaultId={data.vault.id}
            ownerWallet={resolvedOwner}
            network={data.vault.network}
          />
          <RecentCallsCard data={data} />
        </div>

        {/* RIGHT — Policy · Scenarios · Pay.sh */}
        <div className="flex flex-col gap-5 min-w-0">
          <PolicyCard data={data} ownerWallet={resolvedOwner} />
          <ScenariosCard
            vaultId={data.vault.id}
            ownerWallet={resolvedOwner}
            perTxMaxUsd={data.budget.perTxMaxUsd}
            network={data.vault.network}
          />
          <PayShCard vaultId={data.vault.id} ownerWallet={resolvedOwner} />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━ WIRE YOUR AGENT ━━━━━━━━━━━━━━━━━━━━━ */}
      <WireSection vaultId={data.vault.id} ownerWallet={resolvedOwner} />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FooterPills
        vaultId={data.vault.id}
        ownerWallet={resolvedOwner}
        perTxMaxUsd={data.budget.perTxMaxUsd}
        network={data.vault.network}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━ FAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ActionFab data={data} usdcBalance={usdcBalance} />
    </div>
  );
}

/* ════════════════════════════ Floating Action FAB ═══════════════════════ */

function ActionFab({
  data,
  usdcBalance,
}: {
  data: VaultPayload;
  usdcBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const usdcAta = data.vault.vaultPda ?? "";

  return (
    <>
      <div
        className="fixed z-40"
        style={{ right: 28, bottom: 100 }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="absolute right-0 flex flex-col gap-2"
              style={{ bottom: 64 }}
            >
              <FabItem
                icon={<Wallet className="w-3.5 h-3.5" strokeWidth={1.8} />}
                label="Top up vault"
                onClick={() => {
                  setTopUpOpen(true);
                  setOpen(false);
                }}
              />
              <FabItem
                icon={<Code2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
                label="Developer mode"
                href="/app/developer"
              />
              <FabItem
                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}
                label="Deploy a vault"
                href="/vault/new"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          className="grid place-items-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            background: TOK.ink,
            color: "#FFFFFF",
            border: `1px solid ${TOK.ink}`,
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.18), 0 12px 32px -10px rgba(0,0,0,0.28)",
            cursor: "pointer",
          }}
          aria-label={open ? "Close actions" : "Open actions"}
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ display: "inline-flex" }}
          >
            <Plus className="w-5 h-5" strokeWidth={2.2} />
          </motion.span>
        </motion.button>
      </div>

      <TopUpDrawer
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        vaultPda={data.vault.vaultPda}
        usdcAta={usdcAta}
        network={data.vault.network}
        solBalance={0}
        usdcBalance={usdcBalance}
      />
    </>
  );
}

function FabItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className="grid place-items-center flex-shrink-0"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: TOK.surface2,
          color: TOK.ink2,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: TOK.ink,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </span>
    </>
  );
  const sx: React.CSSProperties = {
    padding: "8px 14px 8px 10px",
    borderRadius: 12,
    background: TOK.surface,
    border: `1px solid ${TOK.hairline}`,
    boxShadow: TOK.shadowHi,
    color: TOK.ink,
    cursor: "pointer",
    minWidth: 178,
  };
  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2.5 no-underline"
        style={sx}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5"
      style={sx}
    >
      {inner}
    </button>
  );
}

/* ════════════════════════════ Card primitive ════════════════════════════ */

function Card({
  children,
  className,
  style,
  pad,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  pad?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        background: TOK.surface,
        border: `1px solid ${TOK.hairline}`,
        borderRadius: 18,
        boxShadow: TOK.shadowCard,
        padding: pad ? 22 : 0,
        ...style,
      }}
    >
      {children}
    </motion.section>
  );
}

function CardHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "16px 22px 14px",
        borderBottom: `1px solid ${TOK.hairline}`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TOK.ink,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 11.5,
              color: TOK.ink4,
            }}
          >
            {sub}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

function Eyebrow({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "green";
}) {
  return (
    <span
      style={{
        fontSize: 10.5,
        textTransform: "uppercase",
        letterSpacing: "0.10em",
        color: tone === "green" ? TOK.green : TOK.ink4,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/* ════════════════════════════ HERO — left ════════════════════════════ */

function WorkerIdentityHero({
  data,
  now,
}: {
  data: VaultPayload;
  now: number;
}) {
  const serial = deriveSerial(data.vault.id);
  const paused = !!data.vault.pausedAt;
  const ageMs = Math.max(0, now - Date.parse(data.vault.createdAt));
  const ageStr = formatDur(ageMs);
  const lastCallRel = lastCallRelFrom(data.payments[0]?.createdAt ?? null, now);
  const callsToday = todayCount(data.payments);
  const blockedToday = todayCount(data.payments, "blocked");
  const allowedToday = callsToday - blockedToday;
  const merchants = data.vault.allowedMerchants.length;
  const pdaShort = data.vault.vaultPda
    ? `${data.vault.vaultPda.slice(0, 4)}…${data.vault.vaultPda.slice(-4)}`
    : "—";

  return (
    <Card style={{ padding: "30px 32px 26px" }}>
      <div className="relative">
        <Eyebrow>Your worker</Eyebrow>

        <div className="flex items-center gap-4 mt-2.5">
          <KyvernMark size={56} radius={14} layoutId={false} />
          <div className="min-w-0">
            <h1
              className="m-0"
              style={{
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: TOK.ink,
              }}
            >
              {data.vault.name}
            </h1>
            <div
              className="flex items-center flex-wrap gap-2 mt-1.5"
              style={{ fontSize: 12.5, color: TOK.ink3 }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace), monospace",
                  fontSize: 11.5,
                  color: TOK.ink3,
                }}
              >
                {serial}
              </span>
              <Dot />
              <span className="inline-flex items-center gap-1.5">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: paused ? TOK.amber : TOK.green,
                    boxShadow: `0 0 0 3px ${paused ? TOK.amberSoft : TOK.greenSoft}`,
                    display: "inline-block",
                  }}
                />
                {paused ? "Paused" : "Runtime online"}
              </span>
              <Dot />
              <span>Last call {lastCallRel}</span>
              <Dot />
              <span>Age {ageStr}</span>
            </div>
          </div>
        </div>

        {/* 4-stat bar */}
        <div
          className="mt-6 grid grid-cols-4 overflow-hidden"
          style={{
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            background: TOK.surface2,
          }}
        >
          <Stat
            label="Calls today"
            value={String(callsToday)}
            foot={`${blockedToday} blocked · ${allowedToday} allowed`}
          />
          <Stat
            label="Blocked"
            value={String(blockedToday)}
            valueColor={blockedToday > 0 ? TOK.amber : TOK.ink}
            foot="over-cap, off-allowlist"
          />
          <Stat
            label="Merchants"
            value={String(merchants)}
            foot="allowlisted"
          />
          <Stat label="Vault PDA" valueMono={pdaShort} foot="on-chain account" />
        </div>

        <p
          className="mt-5"
          style={{
            fontSize: 14.5,
            color: TOK.ink2,
            lineHeight: 1.55,
            letterSpacing: "-0.005em",
            maxWidth: "58ch",
            margin: "20px 0 0",
          }}
        >
          <span style={{ color: TOK.ink, fontWeight: 600 }}>
            Your worker can earn and spend
          </span>{" "}
          on Solana, within rules the chain itself enforces.
        </p>
        <p
          className="mt-2.5"
          style={{
            margin: 0,
            fontSize: 14,
            color: TOK.ink3,
            lineHeight: 1.55,
            letterSpacing: "-0.005em",
            maxWidth: "58ch",
          }}
        >
          Every{" "}
          <code
            style={{
              fontFamily: "var(--font-mono, ui-monospace), monospace",
              fontSize: 13,
              color: TOK.ink,
            }}
          >
            vault.pay()
          </code>{" "}
          call routes through your policy program before a single lamport
          moves.
        </p>

        <div className="flex flex-wrap gap-2.5 mt-5">
          <PrimaryButton
            href="#scenarios"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("scenarios");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            label="Watch the chain refuse"
          />
          <GhostButton
            href={
              data.vault.vaultPda
                ? `https://explorer.solana.com/address/${data.vault.vaultPda}?cluster=${data.vault.network}`
                : "#"
            }
            external
            label="Open in Solana Explorer"
            icon={<ExternalLink className="w-3 h-3" strokeWidth={1.6} />}
          />
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  valueMono,
  valueColor,
  foot,
}: {
  label: string;
  value?: string;
  valueMono?: string;
  valueColor?: string;
  foot: string;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRight: `1px solid ${TOK.hairline}`,
      }}
      className="last:border-r-0"
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: TOK.ink4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        className="mt-1.5"
        style={{
          fontSize: valueMono ? 15 : 22,
          fontWeight: 600,
          letterSpacing: valueMono ? 0 : "-0.02em",
          fontVariantNumeric: "tabular-nums",
          color: valueColor ?? TOK.ink,
          fontFamily: valueMono
            ? "var(--font-mono, ui-monospace), monospace"
            : "inherit",
        }}
      >
        {valueMono ?? value}
      </div>
      <div
        className="mt-1"
        style={{ fontSize: 11.5, color: TOK.ink3 }}
      >
        {foot}
      </div>
    </div>
  );
}

/* ════════════════════════════ HERO — right ════════════════════════════ */

function VaultBalanceHero({
  data,
  usdcBalance,
}: {
  data: VaultPayload;
  usdcBalance: number;
}) {
  const bal = usdcBalance ?? 0;
  const [dollars, cents] = bal.toFixed(2).split(".");
  const util = Math.min(100, Math.round(data.budget.dailyUtilization * 100));

  return (
    <Card style={{ padding: "28px 28px 22px" }}>
      <div className="relative">
        <Eyebrow tone="green">Vault balance</Eyebrow>
        <div
          className="mt-3"
          style={{
            fontSize: 60,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: TOK.ink,
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: TOK.ink3,
              fontWeight: 500,
              verticalAlign: 14,
              marginRight: 6,
              letterSpacing: "-0.01em",
            }}
          >
            $
          </span>
          {dollars}
          <span style={{ color: TOK.ink3, fontWeight: 500 }}>.{cents}</span>
        </div>

        <div className="flex flex-col gap-2.5 mt-5">
          <Row label="Solana USDC" value={`${bal.toFixed(2)} USDC`} />
          <Row
            label="Daily cap"
            value={`$${data.budget.spentToday.toFixed(2)} / $${data.budget.dailyLimitUsd.toFixed(2)}`}
          />
          <Row
            label="Weekly cap"
            value={`$${data.budget.spentThisWeek.toFixed(2)} / $${data.budget.weeklyLimitUsd.toFixed(2)}`}
          />
          <Row
            label="Per-transaction max"
            value={`$${data.budget.perTxMaxUsd.toFixed(2)}`}
          />
        </div>

        {/* Daily utilization */}
        <div
          className="mt-4"
          style={{
            height: 6,
            background: TOK.surface2,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, util)}%` }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              display: "block",
              height: "100%",
              background: TOK.green,
              borderRadius: "inherit",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span style={{ fontSize: 11.5, color: TOK.ink4 }}>
            Today&apos;s utilization
          </span>
          <span style={{ fontSize: 11.5, color: TOK.ink2, fontWeight: 500 }}>
            {util}%
          </span>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-center"
      style={{ fontSize: 12.5, color: TOK.ink3 }}
    >
      <span>{label}</span>
      <span
        style={{
          color: TOK.ink,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ════════════════════════════ Workers sidebar ════════════════════════════ */

function WorkersSidebar({
  vaults,
  selectedVaultId,
  onSelect,
  atlas,
}: {
  vaults: VaultTile[];
  selectedVaultId: string | null;
  onSelect: (id: string) => void;
  atlas: AtlasStatus | null;
}) {
  const atlasDays =
    atlas && atlas.uptimeMs > 0
      ? Math.floor(atlas.uptimeMs / (24 * 60 * 60 * 1000))
      : null;

  return (
    <Card>
      <CardHead title="Workers" sub={`${vaults.length + 1} attached`} />

      <div className="flex flex-col">
        {/* Atlas reference */}
        <Link
          href="/atlas"
          target="_blank"
          className="flex gap-3 items-start cursor-pointer"
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${TOK.hairline2}`,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <WorkerSidebarMark letter="A" selected={false} />
          <div className="min-w-0 flex-1">
            <div
              className="flex items-center gap-1.5"
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                color: TOK.ink,
              }}
            >
              Atlas
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  padding: "1px 7px",
                  background: TOK.surface2,
                  border: `1px solid ${TOK.hairline}`,
                  borderRadius: 999,
                  color: TOK.ink3,
                  letterSpacing: "0.04em",
                }}
              >
                REFERENCE
              </span>
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontFamily: "var(--font-mono, ui-monospace), monospace",
                color: TOK.ink4,
                marginTop: 2,
              }}
            >
              KVN-ATLAS01
            </div>
            <div
              className="mt-2"
              style={{ fontSize: 11.5, color: TOK.ink3 }}
            >
              {atlas ? (
                <>
                  <b style={{ color: TOK.ink, fontWeight: 600 }}>
                    {atlas.totalSettled.toLocaleString()}
                  </b>{" "}
                  paid ·{" "}
                  <b style={{ color: TOK.ink, fontWeight: 600 }}>
                    {atlas.totalAttacksBlocked.toLocaleString()}
                  </b>{" "}
                  refused
                  {atlasDays !== null && (
                    <>
                      {" "}
                      ·{" "}
                      <b style={{ color: TOK.ink, fontWeight: 600 }}>
                        {atlasDays}d
                      </b>{" "}
                      autonomous
                    </>
                  )}
                </>
              ) : (
                "loading…"
              )}
            </div>
          </div>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: atlas?.running ? TOK.green : TOK.ink5,
              boxShadow: atlas?.running
                ? `0 0 0 3px ${TOK.greenSoft}`
                : "none",
              flexShrink: 0,
              marginTop: 8,
            }}
          />
        </Link>

        {/* User vaults */}
        {vaults.map((v) => {
          const sel = v.id === selectedVaultId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className="text-left cursor-pointer"
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${TOK.hairline2}`,
                background: sel ? TOK.greenSoft : "transparent",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                border: "none",
                width: "100%",
              }}
            >
              <div
                className="flex-shrink-0"
                style={{
                  filter: sel
                    ? "none"
                    : "grayscale(20%) brightness(0.96)",
                }}
              >
                <KyvernMark size={32} radius={9} layoutId={false} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                    color: TOK.ink,
                  }}
                  className="truncate"
                >
                  {v.name}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontFamily: "var(--font-mono, ui-monospace), monospace",
                    color: TOK.ink4,
                    marginTop: 2,
                  }}
                >
                  {deriveSerial(v.id)}
                </div>
                <div
                  className="mt-2"
                  style={{ fontSize: 11.5, color: TOK.ink3 }}
                >
                  {v.lastCallRel
                    ? `last call ${v.lastCallRel}`
                    : v.paused
                      ? "paused"
                      : "no calls yet"}
                </div>
              </div>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: v.paused ? TOK.amber : TOK.green,
                  boxShadow: v.paused
                    ? `0 0 0 3px ${TOK.amberSoft}`
                    : `0 0 0 3px ${TOK.greenSoft}`,
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
            </button>
          );
        })}

        {/* Deploy CTA */}
        <Link
          href="/vault/new"
          className="flex items-center gap-3 cursor-pointer no-underline"
          style={{
            padding: 18,
            borderTop: `1px dashed ${TOK.hairline}`,
            color: TOK.green,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span
            className="grid place-items-center flex-shrink-0"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: TOK.greenSoft,
              color: TOK.green,
            }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
          </span>
          <span>
            Deploy a vault
            <div
              style={{
                fontSize: 11,
                color: TOK.ink4,
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              60-second clone
            </div>
          </span>
        </Link>
      </div>
    </Card>
  );
}

function WorkerSidebarMark({
  letter,
  selected,
}: {
  letter: string;
  selected: boolean;
}) {
  return (
    <div
      className="grid place-items-center flex-shrink-0"
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: selected ? TOK.ink : TOK.surface2,
        color: selected ? "#FFFFFF" : TOK.ink2,
        border: `1px solid ${selected ? TOK.ink : TOK.hairline}`,
        fontWeight: 600,
        fontSize: 13,
        fontFamily:
          "ui-serif, Georgia, 'New York', 'Times New Roman', serif",
      }}
    >
      {letter}
    </div>
  );
}

/* ════════════════════════════ Runtime card ════════════════════════════ */

interface TapeItem {
  id: string;
  whenMs: number;
  label: string;
  tone: "green" | "amber";
  ts: string;
}

function RuntimeCard({ data }: { data: VaultPayload }) {
  const ageMs = Math.max(0, Date.now() - Date.parse(data.vault.createdAt));
  const ageStr = formatDur(ageMs);
  const [tape, setTape] = useState<TapeItem[]>([]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/decisions?kind=both&limit=14", {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = (await r.json()) as {
          feed?: Array<{
            id: string;
            _kind: "decision" | "attack";
            _when: string;
            outcome?: string;
            amountUsd?: number;
            type?: string;
            description?: string;
          }>;
        };
        if (!alive) return;
        const items: TapeItem[] = (d.feed ?? []).slice(0, 14).map((f) => {
          const whenMs = Date.parse(f._when);
          const ts = new Date(whenMs).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          if (f._kind === "decision") {
            const allowed = f.outcome === "allowed";
            return {
              id: f.id,
              whenMs,
              tone: allowed ? "green" : "amber",
              ts,
              label: allowed
                ? `+$${(f.amountUsd ?? 0).toFixed(2)} paid`
                : `$${(f.amountUsd ?? 0).toFixed(2)} refused`,
            };
          }
          return {
            id: f.id,
            whenMs,
            tone: "amber",
            ts,
            label: (f.type ?? "attack").replace(/_/g, " ") + " refused",
          };
        });
        setTape(items);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 4_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <Card>
      <CardHead
        title="Runtime status"
        sub={`Attached · Age ${ageStr}`}
        right={
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: TOK.greenSoft,
              color: TOK.green,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: TOK.green,
                display: "inline-block",
              }}
            />
            Atlas · Live
          </span>
        }
      />
      <div style={{ padding: "20px 22px" }}>
        <div
          className="rounded-[14px]"
          style={{
            background: TOK.surface2,
            border: `1px solid ${TOK.hairline}`,
            padding: "14px 18px",
            fontFamily: "var(--font-mono, ui-monospace), monospace",
            fontSize: 12.5,
            color: TOK.ink2,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: TOK.green, marginRight: 8 }}>›</span>
          Awaiting strategy. Wire your code via{" "}
          <span style={{ color: TOK.green }}>@kyvernlabs/sdk</span> to define
          this worker&apos;s behavior. Every call routes through the policy
          program.
          <br />
          <span style={{ color: TOK.ink4 }}>• vault on-chain</span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 13,
              background: TOK.green,
              verticalAlign: -2,
              marginLeft: 4,
              animation: "kyvernBlink 1.2s steps(1) infinite",
            }}
          />
        </div>

        <div
          className="mt-5"
          style={{
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: TOK.ink4,
            fontWeight: 600,
          }}
        >
          Atlas · live tape
        </div>
        <div
          className="mt-2 relative overflow-hidden"
          style={{
            height: 42,
            background: TOK.surface2,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
          }}
        >
          {/* edge fades */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 z-10 pointer-events-none"
            style={{
              width: 36,
              background: `linear-gradient(90deg, ${TOK.surface2}, transparent)`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 z-10 pointer-events-none"
            style={{
              width: 36,
              background: `linear-gradient(270deg, ${TOK.surface2}, transparent)`,
            }}
          />
          <motion.div
            className="flex items-center gap-1.5 h-full px-4 whitespace-nowrap"
            animate={{ x: [0, -600] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 38,
                ease: "linear",
              },
            }}
          >
            <AnimatePresence initial={false}>
              {tape.map((it) => (
                <motion.span
                  key={it.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="inline-flex items-center"
                  style={{
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 8,
                    fontFamily: "var(--font-mono, ui-monospace), monospace",
                    fontSize: 11,
                    background:
                      it.tone === "green" ? TOK.greenSoft : TOK.amberSoft,
                    color: it.tone === "green" ? TOK.green : TOK.amber,
                    border: `1px solid ${
                      it.tone === "green" ? TOK.greenLine : TOK.amberLine
                    }`,
                  }}
                >
                  {it.ts} · {it.label}
                </motion.span>
              ))}
            </AnimatePresence>
            <span
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 8,
                fontFamily: "var(--font-mono, ui-monospace), monospace",
                fontSize: 11,
                background: TOK.ink,
                color: "#FFFFFF",
                border: `1px solid ${TOK.ink}`,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              now
            </span>
          </motion.div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes kyvernBlink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </Card>
  );
}

/* ════════════════════════════ SDK Xcode card ════════════════════════════ */

function SdkXcodeCard({ vaultId }: { vaultId: string }) {
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [copied, setCopied] = useState<"snippet" | "install" | null>(null);
  const [activeTab, setActiveTab] = useState<
    "vault" | "policy" | "env" | "byoa"
  >("vault");

  useEffect(() => {
    if (!vaultId) return;
    fetch(`/api/devices/${vaultId}/agent-key`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { keyPrefix?: string | null } | null) =>
          d?.keyPrefix && setKeyPrefix(d.keyPrefix),
      )
      .catch(() => {});
  }, [vaultId]);

  const apiKey = keyPrefix ? `"${keyPrefix}…"` : `process.env.KYVERN_AGENT_KEY`;

  const snippet = `import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: ${apiKey} });
const res   = await vault.pay({
  merchant: "api.openai.com",
  amount:   0.02,
  memo:     "chat-completion · session_a91f",
});

console.log(res.decision);  // "allowed" or "refused"`;

  const copy = (which: "snippet" | "install", text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Card>
      {/* Tabs row with traffic-light dots */}
      <div
        className="flex items-center gap-1"
        style={{
          padding: "10px 14px 0",
          borderBottom: `1px solid ${TOK.hairline}`,
          background: TOK.surface2,
        }}
      >
        <div
          className="flex items-center gap-1.5 self-center"
          style={{
            paddingRight: 12,
            marginRight: 6,
            borderRight: `1px solid ${TOK.hairline}`,
            height: 14,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#FF5F57",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#FEBC2E",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#28C840",
              display: "inline-block",
            }}
          />
        </div>
        {(
          [
            ["vault", "vault.ts"],
            ["policy", "policy.ts"],
            ["env", ".env"],
            ["byoa", "oracle.ts"],
          ] as const
        ).map(([k, label]) => {
          const a = activeTab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTab(k)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 500,
                color: a ? TOK.ink : TOK.ink3,
                background: a ? TOK.surface : "transparent",
                border: a ? `1px solid ${TOK.hairline}` : "1px solid transparent",
                borderBottom: a ? "1px solid " + TOK.surface : "1px solid transparent",
                borderRadius: "8px 8px 0 0",
                position: "relative",
                top: 1,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
        <span
          className="ml-auto"
          style={{
            padding: "8px 12px",
            fontSize: 11,
            color: TOK.ink4,
            fontFamily: "var(--font-mono, ui-monospace), monospace",
          }}
        >
          @kyvernlabs/sdk · 0.4.2
        </span>
      </div>

      {/* Code body */}
      <div
        style={{
          fontFamily: "var(--font-mono, ui-monospace), monospace",
          fontSize: 12.5,
          lineHeight: 1.7,
          color: TOK.ink,
          background: TOK.surface,
          padding: "18px 22px",
          overflowX: "auto",
        }}
      >
        {activeTab === "vault" && <SnippetVault apiKey={apiKey} />}
        {activeTab === "policy" && <SnippetPolicy />}
        {activeTab === "env" && <SnippetEnv keyPrefix={keyPrefix} />}
        {activeTab === "byoa" && <SnippetByoa />}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 18px",
          borderTop: `1px solid ${TOK.hairline}`,
          background: TOK.surface2,
          fontSize: 12,
          color: TOK.ink3,
        }}
      >
        <span>Run this in your terminal</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copy("snippet", snippet)}
            className="inline-flex items-center gap-1.5 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)]"
            style={{
              padding: "5px 9px",
              border: `1px solid ${TOK.hairline}`,
              background: TOK.surface,
              fontSize: 11,
              color: TOK.ink2,
            }}
          >
            {copied === "snippet" ? (
              <Check className="w-3 h-3" strokeWidth={2} />
            ) : (
              <Copy className="w-3 h-3" strokeWidth={1.8} />
            )}
            Copy code
          </button>
          <div
            className="inline-flex items-center gap-2.5"
            style={{
              padding: "5px 9px 5px 14px",
              borderRadius: 999,
              background: TOK.surface,
              border: `1px solid ${TOK.hairline}`,
              fontFamily: "var(--font-mono, ui-monospace), monospace",
              fontSize: 11.5,
              color: TOK.ink2,
            }}
          >
            <span style={{ color: TOK.ink4 }}>$</span>
            npm install @kyvernlabs/sdk
            <button
              type="button"
              onClick={() => copy("install", "npm install @kyvernlabs/sdk")}
              className="grid place-items-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: `1px solid ${TOK.hairline}`,
                background: TOK.surface2,
                color: TOK.ink3,
                cursor: "pointer",
              }}
            >
              {copied === "install" ? (
                <Check className="w-3 h-3" strokeWidth={2} />
              ) : (
                <Copy className="w-3 h-3" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

const TK = {
  kw: "#AD3DA4",
  str: "#D12F1B",
  fn: "#3900A0",
  type: "#1F6FEB",
  cmt: "#65737E",
  num: "#1C00CF",
  punct: TOK.ink2,
};

function LineNo({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 22,
        color: TOK.ink5,
        userSelect: "none",
        textAlign: "right",
        marginRight: 16,
        fontSize: 11.5,
      }}
    >
      {n}
    </span>
  );
}

function SnippetVault({ apiKey }: { apiKey: string }) {
  return (
    <code>
      <div>
        <LineNo n={1} />
        <span style={{ color: TK.kw }}>import</span>
        <span style={{ color: TK.punct }}> {"{ "}</span>
        <span style={{ color: TK.type }}>Vault</span>
        <span style={{ color: TK.punct }}> {"}"} </span>
        <span style={{ color: TK.kw }}>from</span>{" "}
        <span style={{ color: TK.str }}>&quot;@kyvernlabs/sdk&quot;</span>
        <span style={{ color: TK.punct }}>;</span>
      </div>
      <div>
        <LineNo n={2} />
      </div>
      <div>
        <LineNo n={3} />
        <span style={{ color: TK.kw }}>const</span> vault{" "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.kw }}>new</span>{" "}
        <span style={{ color: TK.type }}>Vault</span>
        <span style={{ color: TK.punct }}>({"{ "}</span>
        agentKey<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.str }}>{apiKey}</span>
        <span style={{ color: TK.punct }}> {"}"});</span>
      </div>
      <div>
        <LineNo n={4} />
        <span style={{ color: TK.kw }}>const</span> res{"   "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.kw }}>await</span> vault
        <span style={{ color: TK.punct }}>.</span>
        <span style={{ color: TK.fn }}>pay</span>
        <span style={{ color: TK.punct }}>({"{"}</span>
      </div>
      <div>
        <LineNo n={5} />
        {"  "}merchant<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.str }}>&quot;api.openai.com&quot;</span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={6} />
        {"  "}amount<span style={{ color: TK.punct }}>:{"   "}</span>
        <span style={{ color: TK.num }}>0.02</span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={7} />
        {"  "}memo<span style={{ color: TK.punct }}>:{"     "}</span>
        <span style={{ color: TK.str }}>
          &quot;chat-completion · session_a91f&quot;
        </span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={8} />
        <span style={{ color: TK.punct }}>{"}"});</span>
      </div>
      <div>
        <LineNo n={9} />
      </div>
      <div>
        <LineNo n={10} />
        console<span style={{ color: TK.punct }}>.</span>
        <span style={{ color: TK.fn }}>log</span>
        <span style={{ color: TK.punct }}>(</span>res
        <span style={{ color: TK.punct }}>.</span>decision
        <span style={{ color: TK.punct }}>);</span>{"  "}
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          {`// "allowed" or "refused"`}
        </span>
      </div>
    </code>
  );
}

function SnippetPolicy() {
  return (
    <code>
      <div>
        <LineNo n={1} />
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          {`// policy.ts — declarative, mirrors on-chain enforcement`}
        </span>
      </div>
      <div>
        <LineNo n={2} />
        <span style={{ color: TK.kw }}>export const</span> policy{" "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.punct }}>{"{"}</span>
      </div>
      <div>
        <LineNo n={3} />
        {"  "}dailyCapUsd<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.num }}>5.00</span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={4} />
        {"  "}weeklyCapUsd<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.num }}>25.00</span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={5} />
        {"  "}perTxMaxUsd<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.num }}>0.50</span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={6} />
        {"  "}allowlist<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.punct }}>[</span>
        <span style={{ color: TK.str }}>&quot;api.openai.com&quot;</span>
        <span style={{ color: TK.punct }}>],</span>
      </div>
      <div>
        <LineNo n={7} />
        {"  "}requireMemo<span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.kw }}>true</span>
        <span style={{ color: TK.punct }}>,</span>
      </div>
      <div>
        <LineNo n={8} />
        <span style={{ color: TK.punct }}>{"}"};</span>
      </div>
    </code>
  );
}

function SnippetEnv({ keyPrefix }: { keyPrefix: string | null }) {
  return (
    <code>
      <div>
        <LineNo n={1} />
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          # .env — chain-enforced; the SDK reads these
        </span>
      </div>
      <div>
        <LineNo n={2} />
        KYVERN_AGENT_KEY
        <span style={{ color: TK.punct }}>=</span>
        <span style={{ color: TK.str }}>
          {keyPrefix ? `${keyPrefix}…` : "kv_live_273e03…"}
        </span>
      </div>
      <div>
        <LineNo n={3} />
        KYVERN_NETWORK<span style={{ color: TK.punct }}>=</span>
        <span style={{ color: TK.str }}>devnet</span>
      </div>
    </code>
  );
}

function SnippetByoa() {
  return (
    <code>
      <div>
        <LineNo n={1} />
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          {`// oracle.ts — wrap ANY agent (here: ParallaxPay's market`}
        </span>
      </div>
      <div>
        <LineNo n={2} />
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          {`// oracle) so every HTTP call routes through Kyvern first.`}
        </span>
      </div>
      <div>
        <LineNo n={3} />
        <span style={{ color: TK.kw }}>import</span>
        <span style={{ color: TK.punct }}> {"{ "}</span>
        <span style={{ color: TK.type }}>Vault</span>
        <span style={{ color: TK.punct }}> {"}"} </span>
        <span style={{ color: TK.kw }}>from</span>{" "}
        <span style={{ color: TK.str }}>&quot;@kyvernlabs/sdk&quot;</span>
        <span style={{ color: TK.punct }}>;</span>
      </div>
      <div>
        <LineNo n={4} />
      </div>
      <div>
        <LineNo n={5} />
        <span style={{ color: TK.kw }}>const</span> vault{" "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.kw }}>new</span>{" "}
        <span style={{ color: TK.type }}>Vault</span>
        <span style={{ color: TK.punct }}>({"{ "}</span>agentKey
        <span style={{ color: TK.punct }}>:</span>{" "}
        process<span style={{ color: TK.punct }}>.</span>env
        <span style={{ color: TK.punct }}>.</span>
        <span style={{ color: TK.type }}>KYVERN_AGENT_KEY</span>
        <span style={{ color: TK.punct }}> {"}"});</span>
      </div>
      <div>
        <LineNo n={6} />
      </div>
      <div>
        <LineNo n={7} />
        <span style={{ color: TK.kw }}>export const</span>{" "}
        <span style={{ color: TK.fn }}>kyvernFetch</span>
        <span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.kw }}>typeof</span>{" "}
        <span style={{ color: TK.type }}>fetch</span>{" "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.kw }}>async</span>{" "}
        <span style={{ color: TK.punct }}>(url, init) =&gt; {"{"}</span>
      </div>
      <div>
        <LineNo n={8} />
        {"  "}
        <span style={{ color: TK.kw }}>const</span> host{" "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.kw }}>new</span>{" "}
        <span style={{ color: TK.type }}>URL</span>
        <span style={{ color: TK.punct }}>(url</span>
        <span style={{ color: TK.punct }}>.</span>
        <span style={{ color: TK.fn }}>toString</span>
        <span style={{ color: TK.punct }}>()).hostname;</span>
      </div>
      <div>
        <LineNo n={9} />
        {"  "}
        <span style={{ color: TK.kw }}>const</span> res{" "}
        <span style={{ color: TK.punct }}>=</span>{" "}
        <span style={{ color: TK.kw }}>await</span> vault
        <span style={{ color: TK.punct }}>.</span>
        <span style={{ color: TK.fn }}>pay</span>
        <span style={{ color: TK.punct }}>({"{"}</span> merchant
        <span style={{ color: TK.punct }}>:</span> host
        <span style={{ color: TK.punct }}>,</span> amount
        <span style={{ color: TK.punct }}>:</span>{" "}
        <span style={{ color: TK.num }}>0.001</span>
        <span style={{ color: TK.punct }}>{" });"}</span>
      </div>
      <div>
        <LineNo n={10} />
        {"  "}
        <span style={{ color: TK.kw }}>if</span>{" "}
        <span style={{ color: TK.punct }}>(</span>res
        <span style={{ color: TK.punct }}>.</span>decision{" "}
        <span style={{ color: TK.punct }}>===</span>{" "}
        <span style={{ color: TK.str }}>&quot;refused&quot;</span>
        <span style={{ color: TK.punct }}>)</span>{" "}
        <span style={{ color: TK.kw }}>throw new</span>{" "}
        <span style={{ color: TK.type }}>Error</span>
        <span style={{ color: TK.punct }}>(res.reason);</span>
      </div>
      <div>
        <LineNo n={11} />
        {"  "}
        <span style={{ color: TK.kw }}>return</span>{" "}
        <span style={{ color: TK.fn }}>fetch</span>
        <span style={{ color: TK.punct }}>(url, init);</span>
      </div>
      <div>
        <LineNo n={12} />
        <span style={{ color: TK.punct }}>{"};"}</span>
      </div>
      <div>
        <LineNo n={13} />
      </div>
      <div>
        <LineNo n={14} />
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          {`// Now any HTTP call your agent makes is gated on-chain.`}
        </span>
      </div>
      <div>
        <LineNo n={15} />
        <span style={{ color: TK.cmt, fontStyle: "italic" }}>
          {`// Try it ↓  — the button below uses this exact pattern.`}
        </span>
      </div>
    </code>
  );
}

/* ════════════════════════════ Oracle agent card ═══════════════════════════ */

interface OraclePayment {
  merchant: string;
  amountUsd: number;
  signature: string | null;
  explorerUrl: string | null;
  blocked: boolean;
  reason: string | null;
  durationMs: number;
}

interface OracleResult {
  ok: boolean;
  asset?: string;
  priceUsd?: number | null;
  change24h?: number | null;
  prediction?: string;
  confidence?: number;
  horizon?: string;
  modelUsed?: string;
  payments?: OraclePayment[];
  duration?: number;
  stage?: string;
  reason?: string;
}

function OracleAgentCard({
  vaultId,
  ownerWallet,
  network,
}: {
  vaultId: string;
  ownerWallet: string | null;
  network: "devnet" | "mainnet";
}) {
  void network;
  const [asset, setAsset] = useState<"BTC" | "SOL" | "ETH">("BTC");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OracleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = useCallback(async () => {
    if (!ownerWallet || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/oracle/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ vaultId, asset }),
      });
      const d = (await r.json()) as OracleResult;
      setResult(d);
      if (!d.ok && d.reason) setError(d.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setRunning(false);
    }
  }, [vaultId, ownerWallet, asset, running]);

  return (
    <Card>
      <CardHead
        title="Bring your own agent"
        sub="ParallaxPay market oracle · live"
        right={
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: TOK.greenSoft,
              color: TOK.green,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: TOK.green,
              }}
            />
            third-party agent
          </span>
        }
      />
      <div style={{ padding: "18px 22px 20px" }}>
        <p
          style={{
            fontSize: 12.5,
            color: TOK.ink3,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          A real autonomous agent ported from ParallaxPay (my prior x402
          project). Click below: it fetches a live price from CoinGecko and
          a 1-hour prediction from Commonstack DeepSeek. Both calls are
          gated on-chain by your vault before any HTTP request fires.
        </p>

        {/* Asset segmented control */}
        <div className="flex items-center gap-2 mt-4">
          <span
            style={{
              fontSize: 10.5,
              color: TOK.ink4,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Asset
          </span>
          <div
            className="inline-flex"
            style={{
              padding: 2,
              background: TOK.surface2,
              borderRadius: 8,
              border: `1px solid ${TOK.hairline}`,
            }}
          >
            {(["BTC", "SOL", "ETH"] as const).map((a) => {
              const sel = asset === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAsset(a)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: sel ? TOK.ink : TOK.ink3,
                    background: sel ? TOK.surface : "transparent",
                    border: "0",
                    borderRadius: 6,
                    boxShadow: sel
                      ? "0 1px 2px rgba(0,0,0,0.06)"
                      : "none",
                    cursor: "pointer",
                  }}
                >
                  {a}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={fire}
            disabled={running || !ownerWallet}
            className="ml-auto inline-flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: TOK.ink,
              color: "#FFFFFF",
              border: `1px solid ${TOK.ink}`,
              fontSize: 12.5,
              fontWeight: 500,
              boxShadow:
                "0 1px 0 rgba(0,0,0,0.05), 0 4px 10px -4px rgba(0,0,0,0.18)",
            }}
          >
            {running ? (
              <>
                <span
                  className="w-3 h-3 border rounded-full animate-spin"
                  style={{
                    borderColor: "rgba(255,255,255,0.30)",
                    borderTopColor: "#FFFFFF",
                    borderWidth: 1.5,
                  }}
                />
                Polling chain…
              </>
            ) : (
              <>
                Run prediction agent
                <ChevronRight className="w-3 h-3" strokeWidth={1.8} />
              </>
            )}
          </button>
        </div>

        {/* Result panel */}
        <AnimatePresence>
          {(result || error) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-4 rounded-[12px] overflow-hidden"
              style={{
                background: TOK.surface2,
                border: `1px solid ${TOK.hairline}`,
              }}
            >
              {result?.ok && result.prediction && (
                <div style={{ padding: "14px 16px" }}>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: TOK.ink,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {result.asset}{" "}
                      {result.priceUsd
                        ? `$${result.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : ""}
                    </span>
                    {result.change24h !== null &&
                      result.change24h !== undefined && (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontFamily: "var(--font-mono, monospace)",
                            color:
                              result.change24h >= 0 ? TOK.green : TOK.amber,
                          }}
                        >
                          {result.change24h >= 0 ? "+" : ""}
                          {result.change24h.toFixed(2)}% · 24h
                        </span>
                      )}
                    <span
                      className="ml-auto"
                      style={{
                        fontSize: 10.5,
                        fontFamily: "var(--font-mono, monospace)",
                        color: TOK.ink4,
                      }}
                    >
                      {result.duration}ms · {result.modelUsed}
                    </span>
                  </div>
                  <p
                    className="mt-2"
                    style={{
                      fontSize: 13,
                      color: TOK.ink2,
                      lineHeight: 1.5,
                      margin: "8px 0 0",
                    }}
                  >
                    {result.prediction}
                  </p>
                  {result.confidence !== undefined && (
                    <div
                      className="mt-2 inline-flex items-center gap-1.5"
                      style={{ fontSize: 11, color: TOK.ink3 }}
                    >
                      <span>Confidence</span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          color: TOK.ink,
                          fontWeight: 600,
                        }}
                      >
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                      <span>· horizon 1h</span>
                    </div>
                  )}
                  {result.payments && result.payments.length > 0 && (
                    <div
                      className="mt-3 flex flex-col gap-1.5"
                      style={{
                        borderTop: `1px solid ${TOK.hairline}`,
                        paddingTop: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.10em",
                          color: TOK.ink4,
                          fontWeight: 600,
                        }}
                      >
                        On-chain metering · {result.payments.length} calls
                        settled
                      </div>
                      {result.payments.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2"
                          style={{
                            fontSize: 11.5,
                            fontFamily: "var(--font-mono, monospace)",
                            color: TOK.ink3,
                          }}
                        >
                          <span
                            style={{
                              color: p.blocked ? TOK.amber : TOK.green,
                            }}
                          >
                            {p.blocked ? "×" : "✓"}
                          </span>
                          <span style={{ color: TOK.ink, fontWeight: 500 }}>
                            {p.merchant}
                          </span>
                          <span style={{ color: TOK.ink4 }}>
                            ${p.amountUsd.toFixed(3)}
                          </span>
                          <span className="ml-auto">{p.durationMs}ms</span>
                          {p.explorerUrl && (
                            <a
                              href={p.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 no-underline"
                              style={{ color: TOK.green }}
                            >
                              Explorer
                              <ExternalLink
                                className="w-2.5 h-2.5"
                                strokeWidth={1.8}
                              />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {(!result?.ok || error) && (
                <div
                  style={{
                    padding: "12px 16px",
                    fontSize: 12.5,
                    color: TOK.amber,
                  }}
                >
                  Refused on-chain · {error ?? result?.reason ?? "unknown"}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/* ════════════════════════════ Recent calls card ════════════════════════════ */

function RecentCallsCard({ data }: { data: VaultPayload }) {
  const items = data.payments.slice(0, 4);

  return (
    <Card>
      <CardHead
        title="Recent SDK calls"
        sub={`Last 24 hours · ${items.length} ${items.length === 1 ? "event" : "events"}`}
      />
      <div>
        {items.length === 0 && (
          <div
            style={{
              padding: "22px",
              fontSize: 12.5,
              color: TOK.ink4,
              textAlign: "center",
            }}
          >
            No calls yet. Wire the SDK above and they appear here.
          </div>
        )}
        {items.map((p) => {
          const blocked =
            p.status === "blocked" || p.status === "failed";
          const ts = new Date(
            typeof p.createdAt === "string" && !p.createdAt.includes("T")
              ? p.createdAt.replace(" ", "T") + "Z"
              : String(p.createdAt),
          ).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return (
            <div
              key={p.id}
              className="grid items-center gap-3"
              style={{
                gridTemplateColumns: "60px 1fr auto auto",
                padding: "13px 22px",
                borderBottom: `1px solid ${TOK.hairline2}`,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace), monospace",
                  fontSize: 11.5,
                  color: TOK.ink4,
                }}
              >
                {ts}
              </span>
              <span
                style={{
                  color: TOK.ink,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
                className="truncate"
              >
                {p.merchant}
                {p.memo && (
                  <span
                    style={{ color: TOK.ink4, fontSize: 11.5, marginLeft: 6 }}
                  >
                    · {p.memo.slice(0, 32)}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: TOK.ink3,
                  fontSize: 12.5,
                }}
              >
                ${
                  p.amountUsd < 0.01
                    ? p.amountUsd.toFixed(3)
                    : p.amountUsd.toFixed(2)
                }
              </span>
              {p.txSignature ? (
                <a
                  href={`https://explorer.solana.com/tx/${p.txSignature}?cluster=${data.vault.network}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 no-underline transition hover:opacity-80"
                  style={{
                    height: 22,
                    padding: "0 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: blocked ? TOK.amberSoft : TOK.greenSoft,
                    color: blocked ? TOK.amber : TOK.green,
                  }}
                  title="Open this transaction on Solana Explorer"
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: "currentColor",
                      display: "inline-block",
                    }}
                  />
                  {blocked
                    ? `Blocked${p.reason ? ` · ${p.reason}` : ""}`
                    : "Allowed"}
                  <ExternalLink className="w-2.5 h-2.5" strokeWidth={2} />
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{
                    height: 22,
                    padding: "0 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: blocked ? TOK.amberSoft : TOK.greenSoft,
                    color: blocked ? TOK.amber : TOK.green,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: "currentColor",
                      display: "inline-block",
                    }}
                  />
                  {blocked
                    ? `Blocked${p.reason ? ` · ${p.reason}` : ""}`
                    : "Allowed"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ════════════════════════════ Right column ════════════════════════════ */

function PolicyCard({
  data,
  ownerWallet,
}: {
  data: VaultPayload;
  ownerWallet: string | null;
}) {
  return (
    <Card pad>
      <Eyebrow>Policy</Eyebrow>
      <h2
        className="mt-2"
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: TOK.ink,
          margin: "6px 0 0",
        }}
      >
        Enforced on-chain
      </h2>
      <p
        style={{
          margin: "6px 0 14px",
          fontSize: 12.5,
          color: TOK.ink3,
          lineHeight: 1.5,
        }}
      >
        A Squads v4 multisig program{" "}
        <code
          style={{
            fontFamily: "var(--font-mono, ui-monospace), monospace",
            fontSize: 11.5,
            color: TOK.ink,
          }}
        >
          (PpmZ…MSqc)
        </code>{" "}
        gates every transfer.
      </p>

      <div className="mt-1">
        <PolicyRibbon budget={data.budget} layout="2x2" />
      </div>

      <div className="mt-3">
        <Allowlist
          merchants={data.vault.allowedMerchants}
          vaultId={data.vault.id}
          ownerWallet={ownerWallet}
          compact
        />
      </div>
    </Card>
  );
}

function ScenariosCard({
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
  return (
    <Card pad>
      <div id="scenarios" />
      <ScenarioPanel
        vaultId={vaultId}
        ownerWallet={ownerWallet}
        perTxMaxUsd={perTxMaxUsd}
        network={network}
      />
    </Card>
  );
}

function PayShCard({
  vaultId,
  ownerWallet,
}: {
  vaultId: string;
  ownerWallet: string | null;
}) {
  return (
    <Card pad>
      <PayShFlow vaultId={vaultId} ownerWallet={ownerWallet} />
    </Card>
  );
}

/* ════════════════════════════ Wire your agent ════════════════════════════ */

function WireSection({
  vaultId,
  ownerWallet,
}: {
  vaultId: string;
  ownerWallet: string | null;
}) {
  return (
    <Card style={{ padding: "30px 32px" }}>
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <Eyebrow>Integration · Next steps</Eyebrow>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: TOK.ink,
              margin: "6px 0 4px",
            }}
          >
            Wire your agent in five steps
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: TOK.ink3,
              maxWidth: "58ch",
              lineHeight: 1.5,
            }}
          >
            Mint a key, install the SDK, run your first chain-enforced payment.
            We&apos;ll watch the policy program respond live.
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-[14px]">
        <IntegrationWizard vaultId={vaultId} ownerWallet={ownerWallet} />
      </div>
    </Card>
  );
}

/* ════════════════════════════ Footer pills ════════════════════════════ */

function FooterPills({
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
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className="flex items-center justify-center gap-3 flex-wrap pt-2"
      >
        <Link
          href="/app/developer"
          className="inline-flex items-center gap-2 no-underline"
          style={{
            padding: "5px 11px",
            borderRadius: 999,
            border: `1px solid ${TOK.hairline}`,
            background: TOK.surface,
            color: TOK.ink3,
            fontSize: 12,
          }}
        >
          <Code2 className="w-3 h-3" strokeWidth={1.6} />
          Developer mode
        </Link>
        <button
          type="button"
          onClick={() => ownerWallet && setTerminalOpen(true)}
          disabled={!ownerWallet}
          className="inline-flex items-center gap-2"
          style={{
            padding: "5px 11px",
            borderRadius: 999,
            border: `1px solid ${TOK.hairline}`,
            background: TOK.surface,
            color: TOK.ink3,
            fontSize: 12,
            cursor: ownerWallet ? "pointer" : "not-allowed",
            opacity: ownerWallet ? 1 : 0.6,
          }}
        >
          <Terminal className="w-3 h-3" strokeWidth={1.6} />
          Secure terminal
        </button>
        <button
          type="button"
          onClick={() => ownerWallet && setHeistOpen(true)}
          disabled={!ownerWallet}
          className="inline-flex items-center gap-2"
          style={{
            padding: "5px 11px",
            borderRadius: 999,
            border: `1px solid ${TOK.hairline}`,
            background: TOK.surface,
            color: TOK.ink3,
            fontSize: 12,
            cursor: ownerWallet ? "pointer" : "not-allowed",
            opacity: ownerWallet ? 1 : 0.6,
          }}
        >
          <ShieldAlert className="w-3 h-3" strokeWidth={1.6} />
          Watch the chain refuse
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

/* ════════════════════════════ Small bits ════════════════════════════ */

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: 999,
        background: TOK.ink5,
        display: "inline-block",
      }}
    />
  );
}

function PrimaryButton({
  href,
  onClick,
  label,
}: {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 no-underline transition-all active:scale-[0.98]"
      style={{
        height: 34,
        padding: "0 16px",
        borderRadius: 10,
        background: TOK.ink,
        color: "#FFFFFF",
        border: `1px solid ${TOK.ink}`,
        fontSize: 13,
        fontWeight: 500,
        boxShadow:
          "0 1px 0 rgba(0,0,0,0.05), 0 4px 10px -4px rgba(0,0,0,0.18)",
      }}
    >
      {label}
      <ChevronRight className="w-3 h-3" strokeWidth={1.8} />
    </a>
  );
}

function GhostButton({
  href,
  external,
  label,
  icon,
}: {
  href: string;
  external?: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 no-underline transition-colors"
      style={{
        height: 34,
        padding: "0 16px",
        borderRadius: 10,
        border: `1px solid ${TOK.hairline}`,
        background: TOK.surface,
        color: TOK.ink,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {label}
      {icon}
    </a>
  );
}

/* ════════════════════════════ Skeleton ════════════════════════════ */

function SkeletonHero() {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: "minmax(0,1.42fr) minmax(0,1fr)" }}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            background: TOK.surface,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 18,
            boxShadow: TOK.shadowCard,
            minHeight: 320,
          }}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════ Helpers ════════════════════════════ */

function formatDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function lastCallRelFrom(raw: string | null, now: number): string {
  if (!raw) return "no calls yet";
  const ms = Date.parse(
    typeof raw === "string" && !raw.includes("T")
      ? raw.replace(" ", "T") + "Z"
      : String(raw),
  );
  if (isNaN(ms)) return "no calls yet";
  const diff = now - ms;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function todayCount(
  payments: Array<{ createdAt: string; status: string }>,
  filterStatus?: "blocked",
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMs = today.getTime();
  return payments.filter((p) => {
    const t = Date.parse(
      typeof p.createdAt === "string" && !p.createdAt.includes("T")
        ? p.createdAt.replace(" ", "T") + "Z"
        : String(p.createdAt),
    );
    if (isNaN(t) || t < startMs) return false;
    if (filterStatus === "blocked")
      return p.status === "blocked" || p.status === "failed";
    return true;
  }).length;
}
