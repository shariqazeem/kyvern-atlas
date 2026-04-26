"use client";

/**
 * /app/agents/spawn — two-screen worker hiring flow.
 *
 * Section 2B of the Grand Champion plan.
 *
 *   Screen 1 ("template")  — 4-card 2x2 picker. Tap → screen 2.
 *   Screen 2 ("configure") — name + emoji + job (chips + textarea),
 *                            primary Spawn button, "Customize" link
 *                            opens the depth drawer.
 *   On Spawn               — Birth animation overlay plays for ~1.6s,
 *                            then router.push to /app/agents/[id]?fresh=true
 *                            (the activation banner from 3C takes over).
 *
 * Most users finish in 3 taps: pick template → tap chip → Spawn.
 * The 5% who care about depth tap Customize — sliders, abilities,
 * cadence, and the on-chain budget callout that flips a judge from
 * "consumer UI" to "wait, this is a smart contract."
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, RefreshCw, Sliders } from "lucide-react";
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
import { BirthAnimation } from "@/components/spawn/birth-animation";

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

/** Slider defaults per template — Hunter starts aggressive, Earner cautious. */
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
  return ticksPerDay * 0.00003; // gpt-oss-120b per-tick estimate
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

  // Step machine
  const [screen, setScreen] = useState<"template" | "configure" | "spawning">(
    "template",
  );

  // Picked template
  const [template, setTemplate] = useState<AgentTemplate | null>(null);

  // Configure state
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

  // Load vaults + tools
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

  // When user picks a template → pre-fill configure state, advance screen
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
      // Hold on the birth animation a beat — onComplete will redirect.
      // Stash the new id; the BirthAnimation onComplete callback navigates.
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
      // POST is still pending or failed — fall back gracefully
      setScreen("configure");
    }
  };

  // No-device state — keep the existing nudge to /vault/new
  if (vaults.length === 0 && !isLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-[14px] text-[#6B6B6B] mb-3">
          You need a device before hiring workers.
        </p>
        <Link
          href="/vault/new"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[12px] text-[13px] font-semibold"
          style={{ background: "#0A0A0A", color: "#fff" }}
        >
          Get your Kyvern <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2 pb-16">
      {/* Top: back link */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9B9B9B] mb-4 hover:text-[#6B6B6B]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Home
      </Link>

      <AnimatePresence mode="wait">
        {/* ───────── SCREEN 1: Hire a worker ───────── */}
        {screen === "template" && (
          <motion.div
            key="screen1"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22 }}
          >
            <h1 className="text-[26px] font-semibold tracking-tight text-[#0A0A0A]">
              Hire a worker
            </h1>
            <p className="text-[13px] text-[#6B6B6B] mb-6">
              For{" "}
              <span className="font-mono text-[#0A0A0A]">{serial}</span>. Pick the
              shape — you can fine-tune the rest in the next step.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PICKER.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className="text-left rounded-[16px] p-4 transition-all active:scale-[0.99] hover:shadow-md"
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[26px]"
                      style={{
                        background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
                        border: "1px solid rgba(0,0,0,0.04)",
                      }}
                    >
                      {t.emoji}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#D1D5DB] mt-1" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">
                    {t.name}
                  </h3>
                  <p className="text-[12px] text-[#6B6B6B] leading-[1.5] mb-3">
                    {t.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#F3F4F6",
                        color: "#374151",
                      }}
                    >
                      {t.earningStyle}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "#F3F4F6",
                        color: "#374151",
                      }}
                    >
                      {t.activityLevel}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ───────── SCREEN 2: Configure ───────── */}
        {screen === "configure" && selectedTemplate && (
          <motion.div
            key="screen2"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22 }}
          >
            <button
              onClick={() => setScreen("template")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#9B9B9B] mb-2 hover:text-[#6B6B6B]"
            >
              <ArrowLeft className="w-3 h-3" />
              All workers
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[26px]"
                style={{
                  background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                {emoji}
              </div>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#0A0A0A] leading-tight">
                  Configure {selectedTemplate.name}
                </h1>
                <p className="text-[12px] text-[#9B9B9B]">
                  {selectedTemplate.description}
                </p>
              </div>
            </div>

            {/* Name + emoji */}
            <div className="mb-5">
              <label className="block text-[11px] font-medium text-[#6B6B6B] mb-1.5">
                Name
              </label>
              <div className="flex items-center gap-1.5 mb-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sentinel"
                  className="flex-1 px-3 py-2 rounded-[10px] text-[14px] outline-none"
                  style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
                />
                <button
                  type="button"
                  onClick={cycleName}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{ background: "#F5F5F5", color: "#6B6B6B" }}
                  aria-label="Suggest another name"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PALETTE.map((e) => {
                  const active = e === emoji;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] transition active:scale-[0.95]"
                      style={{
                        background: active ? "#0A0A0A" : "#fff",
                        border: active
                          ? "1px solid #0A0A0A"
                          : "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Job */}
            <div className="mb-5">
              <label className="block text-[11px] font-medium text-[#6B6B6B] mb-1.5">
                What&apos;s the job?
              </label>
              {selectedTemplate.jobSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTemplate.jobSuggestions.map((s) => {
                    const active = activeChip === s.label;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => onChip(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full transition active:scale-[0.97]"
                        style={{
                          background: active ? "#0A0A0A" : "#fff",
                          color: active ? "#fff" : "#0A0A0A",
                          border: active
                            ? "1px solid #0A0A0A"
                            : "1px solid rgba(0,0,0,0.1)",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <textarea
                value={job}
                onChange={(e) => {
                  setJob(e.target.value);
                  setActiveChip(null);
                }}
                rows={5}
                placeholder={selectedTemplate.jobPromptPlaceholder}
                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none leading-[1.5] resize-none"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
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
                  address before spawning, or your worker will loop asking your
                  owner for a Solana address.
                </div>
              )}
            </div>

            {/* Abilities granted (collapsed summary) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-full flex items-center justify-between rounded-[12px] px-3 py-3 mb-5 transition active:scale-[0.99]"
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#6B6B6B]" />
                <div className="text-left">
                  <div className="text-[12.5px] font-medium text-[#0A0A0A]">
                    {tools.length} {tools.length === 1 ? "ability" : "abilities"} granted
                  </div>
                  <div className="text-[11px] text-[#9B9B9B]">
                    Cadence: every {Math.round(frequency / 60) || frequency / 60} min ·
                    on-chain caps inherited from {serial}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#6B6B6B] font-medium">
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

            {/* Primary spawn button */}
            <button
              type="button"
              onClick={handleSpawn}
              disabled={!canSpawn}
              className="w-full h-12 rounded-[12px] text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#0A0A0A", color: "#fff" }}
            >
              {canSpawn ? (
                <>
                  Spawn {name || "worker"}
                  <span className="ml-1.5 font-mono opacity-70">
                    · ~{fmtCost(dailyCostUsd)}/day
                  </span>
                </>
              ) : (
                "Fill in name + job to spawn"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize drawer (overlays configure screen) */}
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

      {/* Birth animation overlay (during spawn) */}
      <AnimatePresence>
        {screen === "spawning" && (
          <BirthAnimation name={name} emoji={emoji} onComplete={onBirthComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
