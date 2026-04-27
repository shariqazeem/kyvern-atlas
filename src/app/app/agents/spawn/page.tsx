"use client";

/**
 * /app/agents/spawn — two-screen worker hiring flow, rebuilt as a
 * physical "module install" ritual.
 *
 *   Screen 1 ("module")    — 5 cartridge tiles. Tap = pick the module.
 *   Screen 2 ("calibrate") — name + emoji + job + cadence calibration,
 *                            then INSTALL MODULE primary action.
 *   Screen 3 ("installing") — physical install animation overlay (the
 *                             worker icon literally slides into a slot
 *                             on a mini chassis), then router.push to
 *                             /app/agents/[id]?fresh=true.
 *
 * Most users finish in 3 taps: pick module → tap chip → install. The 5%
 * who care about depth tap "Customize ↗" — sliders, abilities, cadence,
 * on-chain budget callout (still in the existing CustomizeDrawer).
 *
 * Light premium register everywhere; the dark birth-animation surface
 * has been replaced by a chassis-style installer.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Sliders } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getPickerTemplates,
  getTemplate,
  EMOJI_PALETTE,
  NAME_POOL,
} from "@/lib/agents/templates";
import type { AgentTemplate, AgentTemplateDef } from "@/lib/agents/types";
import {
  CustomizeDrawer,
  derivePersonalityPrompt,
} from "@/components/spawn/customize-drawer";
import { CartridgePicker } from "@/components/spawn/cartridge-picker";
import { InstallAnimation } from "@/components/spawn/install-animation";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    pausedAt: string | null;
    network: "devnet" | "mainnet";
    perTxMaxUsd?: number;
    dailyLimitUsd?: number;
  };
  budget?: {
    spentToday: number;
    dailyLimitUsd: number;
    dailyUtilization: number;
  };
}

interface ToolMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  costsMoney: boolean;
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  const K = "kyvern:dev-wallet";
  const e = window.localStorage.getItem(K);
  if (e) return e;
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(K, s);
  return s;
}

const PICKER = getPickerTemplates();

function defaultSliders(template: AgentTemplate): { lc: number; ca: number } {
  switch (template) {
    case "scout":
      return { lc: 25, ca: 20 };
    case "earner":
      return { lc: 0, ca: 50 };
    case "hunter":
      return { lc: -30, ca: -50 };
    default:
      return { lc: 0, ca: 0 };
  }
}

function estimateDailyCostUsd(seconds: number): number {
  const ticksPerDay = 86_400 / Math.max(60, seconds);
  return ticksPerDay * 0.00003;
}

function fmtCost(usd: number): string {
  if (usd < 0.01) return `${(usd * 100).toFixed(2)}¢`;
  return `$${usd.toFixed(3)}`;
}

function deriveSerial(vaultId: string): string {
  return `KVN-${vaultId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

export default function SpawnPage() {
  const router = useRouter();
  const { wallet, isLoading } = useAuth();

  const [vaults, setVaults] = useState<VaultBrief[]>([]);
  const [allTools, setAllTools] = useState<ToolMeta[]>([]);

  const [screen, setScreen] = useState<"template" | "configure" | "spawning">(
    "template",
  );

  const [template, setTemplate] = useState<AgentTemplate | null>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🔭");
  const [job, setJob] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [frequency, setFrequency] = useState(240);
  const [logicalCreative, setLogicalCreative] = useState(0);
  const [cautiousAggressive, setCautiousAggressive] = useState(0);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [nameSeed, setNameSeed] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate: AgentTemplateDef | null = useMemo(
    () => (template ? getTemplate(template) ?? null : null),
    [template],
  );

  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) return;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => setVaults(d?.vaults ?? []));
    fetch("/api/tools")
      .then((r) => (r.ok ? r.json() : { tools: [] }))
      .then((d) => setAllTools(d?.tools ?? []));
  }, [wallet, isLoading]);

  const pickTemplate = (id: AgentTemplate) => {
    const t = getTemplate(id);
    if (!t) return;
    setTemplate(id);
    setName(t.suggestedName || NAME_POOL[0]);
    setEmoji(t.emoji);
    setJob(t.jobPromptExample);
    setTools(t.recommendedTools);
    setFrequency(t.defaultFrequencySeconds);
    const def = defaultSliders(id);
    setLogicalCreative(def.lc);
    setCautiousAggressive(def.ca);
    setActiveChip(null);
    setScreen("configure");
  };

  const cycleName = () => {
    setNameSeed((s) => s + 1);
    setName(NAME_POOL[(nameSeed + 1) % NAME_POOL.length]);
  };

  const onChip = (chip: { label: string; job: string }) => {
    setJob(chip.job);
    setActiveChip(chip.label);
  };

  const vault = vaults[0]?.vault;
  const serial = vault ? deriveSerial(vault.id) : "KVN-——————";
  const perTxMaxUsd = vault?.perTxMaxUsd ?? 0.5;
  const dailyLimitUsd = vault?.dailyLimitUsd ?? vaults[0]?.budget?.dailyLimitUsd ?? 5;
  const network = (vault?.network ?? "devnet") as "devnet" | "mainnet";

  const dailyCostUsd = estimateDailyCostUsd(frequency);
  const personalityPrompt = useMemo(
    () => derivePersonalityPrompt(name, logicalCreative, cautiousAggressive),
    [name, logicalCreative, cautiousAggressive],
  );

  const canSpawn =
    !!template && name.trim().length >= 2 && job.trim().length >= 5 && tools.length > 0;

  const handleSpawn = async () => {
    if (!vault || !template) {
      setError("Need a device + a template before spawning.");
      return;
    }
    setError(null);
    setScreen("spawning");
    try {
      const res = await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: vault.id,
          template,
          name,
          emoji,
          personalityPrompt,
          jobPrompt: job,
          allowedTools: tools,
          frequencySeconds: frequency,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.agent) throw new Error(data.error ?? "spawn failed");
      sessionStorage.setItem("kyvern:last-spawn-id", data.agent.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "spawn failed");
      setScreen("configure");
    }
  };

  const onBirthComplete = () => {
    const id = sessionStorage.getItem("kyvern:last-spawn-id");
    if (id) {
      sessionStorage.removeItem("kyvern:last-spawn-id");
      router.push(`/app/agents/${id}?fresh=true`);
    } else {
      setScreen("configure");
    }
  };

  if (vaults.length === 0 && !isLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-[14px] text-[#6B6B6B] mb-3">
          You need a device before installing modules.
        </p>
        <Link
          href="/vault/new"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[12px] text-[13px] font-semibold"
          style={{ background: "#0A0A0A", color: "#fff" }}
        >
          Get your Kyvern
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2 pb-16">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9B9B9B] mb-4 hover:text-[#6B6B6B]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Home
      </Link>

      <AnimatePresence mode="wait">
        {/* ───────── SCREEN 1: Module library ───────── */}
        {screen === "template" && (
          <motion.div
            key="screen1"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <CartridgePicker
              templates={PICKER}
              serial={serial}
              onPick={pickTemplate}
            />
          </motion.div>
        )}

        {/* ───────── SCREEN 2: Calibrate ───────── */}
        {screen === "configure" && selectedTemplate && (
          <motion.div
            key="screen2"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <button
              onClick={() => setScreen("template")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#9B9B9B] mb-3 hover:text-[#6B6B6B]"
            >
              <ArrowLeft className="w-3 h-3" />
              All modules
            </button>

            {/* Module preview header — small chassis-feel card showing the
                picked module about to dock with KVN-XXXX. */}
            <div
              className="relative rounded-[18px] overflow-hidden mb-5"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: [
                  "inset 0 1px 0 rgba(255,255,255,1)",
                  "0 1px 2px rgba(15,23,42,0.04)",
                  "0 8px 24px -10px rgba(15,23,42,0.08)",
                ].join(", "),
              }}
            >
              <div
                aria-hidden
                className="absolute top-0 left-6 right-6 pointer-events-none"
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
                }}
              />
              <div className="relative px-5 py-4 flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[28px]"
                  style={{
                    background: "linear-gradient(180deg, #F2F3F5 0%, #FFFFFF 100%)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    boxShadow:
                      "inset 0 1px 2px rgba(15,23,42,0.06), inset 0 -1px 0 rgba(255,255,255,0.8)",
                  }}
                >
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-mono text-[9px] uppercase tracking-[0.16em] mb-1"
                    style={{ color: "#9CA3AF" }}
                  >
                    Module · {selectedTemplate.name}
                  </div>
                  <h1 className="text-[20px] font-semibold tracking-tight text-[#0A0A0A] leading-tight">
                    Calibrate before install
                  </h1>
                  <p className="text-[12px] text-[#6B6B6B] mt-0.5">
                    Docking into{" "}
                    <span className="font-mono text-[#374151]">{serial}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <Field label="Name">
              <div className="flex items-center gap-1.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sentinel"
                  className="flex-1 px-3 py-2.5 rounded-[10px] text-[14px] outline-none focus:border-[#0A0A0A] transition"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
                  }}
                />
                <button
                  type="button"
                  onClick={cycleName}
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center transition active:scale-[0.95]"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: "#6B6B6B",
                  }}
                  aria-label="Suggest another name"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {EMOJI_PALETTE.map((e) => {
                  const active = e === emoji;
                  return (
                    <motion.button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      whileTap={{ scale: 0.92 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 22,
                        mass: 0.6,
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[18px]"
                      style={{
                        background: active ? "#0A0A0A" : "#FFFFFF",
                        border: active
                          ? "1px solid #0A0A0A"
                          : "1px solid rgba(15,23,42,0.08)",
                        boxShadow: active
                          ? "0 1px 2px rgba(15,23,42,0.20)"
                          : "0 1px 2px rgba(15,23,42,0.03)",
                      }}
                    >
                      {e}
                    </motion.button>
                  );
                })}
              </div>
            </Field>

            {/* Job */}
            <Field label="What's the job?">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTemplate.jobSuggestions.map((s) => {
                  const active = activeChip === s.label;
                  return (
                    <motion.button
                      key={s.label}
                      type="button"
                      onClick={() => onChip(s)}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 22,
                        mass: 0.6,
                      }}
                      className="text-[11.5px] px-3 py-1.5 rounded-full"
                      style={{
                        background: active ? "#0A0A0A" : "#FFFFFF",
                        color: active ? "#FFFFFF" : "#0A0A0A",
                        border: active
                          ? "1px solid #0A0A0A"
                          : "1px solid rgba(15,23,42,0.10)",
                      }}
                    >
                      {s.label}
                    </motion.button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setJob("");
                    setActiveChip(null);
                  }}
                  className="text-[11.5px] px-3 py-1.5 rounded-full transition active:scale-[0.97]"
                  style={{
                    background: "#FFFFFF",
                    color: "#6B6B6B",
                    border: "1px dashed rgba(15,23,42,0.18)",
                  }}
                >
                  Custom job →
                </button>
              </div>
              <textarea
                value={job}
                onChange={(e) => {
                  setJob(e.target.value);
                  setActiveChip(null);
                }}
                rows={5}
                placeholder={selectedTemplate.jobPromptPlaceholder}
                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none leading-[1.5] resize-none focus:border-[#0A0A0A] transition"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
                }}
              />
              {/^.*0x[0-9a-fA-F]{40}.*$/m.test(job) && (
                <div
                  className="mt-2 px-3 py-2 rounded-[10px] text-[11px] leading-[1.5]"
                  style={{
                    background: "#FEF3C7",
                    border: "1px solid #FDE68A",
                    color: "#92400E",
                  }}
                >
                  <strong>That looks like an Ethereum address (0x…).</strong>{" "}
                  Workers run on Solana — wallets here are base58. Replace the
                  address before installing, or your worker will loop asking
                  your owner for a Solana address.
                </div>
              )}
            </Field>

            {/* Hardware-spec strip — links into the Customize drawer */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-full flex items-center justify-between rounded-[14px] px-4 py-3.5 mb-5 transition active:scale-[0.99] hover:border-[#0A0A0A]"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(180deg, #F2F3F5 0%, #FFFFFF 100%)",
                    border: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  <Sliders className="w-3.5 h-3.5 text-[#374151]" strokeWidth={1.7} />
                </div>
                <div className="text-left">
                  <div className="text-[12.5px] font-medium text-[#0A0A0A]">
                    {tools.length}{" "}
                    {tools.length === 1 ? "ability" : "abilities"} granted ·{" "}
                    every {Math.max(1, Math.round(frequency / 60))} min
                  </div>
                  <div className="text-[11px] text-[#9B9B9B] mt-0.5">
                    On-chain caps inherit from{" "}
                    <span className="font-mono">{serial}</span>
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">
                Customize ↗
              </span>
            </button>

            {error && (
              <div
                className="mb-3 px-3 py-2 rounded-[10px] text-[12px]"
                style={{
                  background: "#FEE2E2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                }}
              >
                {error}
              </div>
            )}

            {/* INSTALL MODULE primary action */}
            <motion.button
              type="button"
              onClick={handleSpawn}
              disabled={!canSpawn}
              whileTap={canSpawn ? { scale: 0.985 } : undefined}
              transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
              className="w-full h-[52px] rounded-[14px] text-[14px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "#0A0A0A",
                color: "#FFFFFF",
                boxShadow: canSpawn
                  ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10), 0 8px 18px -6px rgba(15,23,42,0.30)"
                  : undefined,
              }}
            >
              {canSpawn ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
                    Install ↓
                  </span>
                  <span>{name || "module"}</span>
                  <span className="font-mono text-[11px] opacity-60">
                    · ~{fmtCost(dailyCostUsd)}/day
                  </span>
                </span>
              ) : (
                "Fill in name + job to install"
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTemplate && (
        <CustomizeDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          logicalCreative={logicalCreative}
          setLogicalCreative={setLogicalCreative}
          cautiousAggressive={cautiousAggressive}
          setCautiousAggressive={setCautiousAggressive}
          allTools={allTools}
          selectedTools={tools}
          setSelectedTools={setTools}
          recommendedTools={selectedTemplate.recommendedTools}
          frequencySeconds={frequency}
          setFrequencySeconds={setFrequency}
          perTxMaxUsd={perTxMaxUsd}
          dailyLimitUsd={dailyLimitUsd}
          network={network}
        />
      )}

      <AnimatePresence>
        {screen === "spawning" && (
          <InstallAnimation
            name={name}
            emoji={emoji}
            serial={serial}
            perTxMaxUsd={perTxMaxUsd}
            dailyLimitUsd={dailyLimitUsd}
            onComplete={onBirthComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
