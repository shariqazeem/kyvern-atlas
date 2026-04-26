"use client";

/**
 * /app/agents/spawn — Agent spawn ritual.
 *
 * Four steps:
 *   1. Pick template
 *   2. Name + emoji + personality
 *   3. Job description + tools
 *   4. Frequency + review + spawn
 *
 * On spawn: POST /api/agents/spawn → redirect to /app/agents/[id]
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TEMPLATES, ATLAS_TEMPLATE_DEF } from "@/lib/agents/templates";
import type { AgentTemplate, AgentTemplateDef } from "@/lib/agents/types";

interface VaultBrief {
  vault: { id: string; name: string; emoji: string };
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
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

const ALL_TEMPLATES: AgentTemplateDef[] = [ATLAS_TEMPLATE_DEF, ...TEMPLATES];

export default function SpawnPage() {
  const router = useRouter();
  const { wallet, isLoading } = useAuth();

  const [vaults, setVaults] = useState<VaultBrief[]>([]);
  const [allTools, setAllTools] = useState<ToolMeta[]>([]);
  const [step, setStep] = useState(0);
  const [spawning, setSpawning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [template, setTemplate] = useState<AgentTemplate>("scout");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [personality, setPersonality] = useState("");
  const [job, setJob] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [frequency, setFrequency] = useState(180);

  const selectedTemplate = useMemo(
    () => ALL_TEMPLATES.find((t) => t.id === template) ?? ALL_TEMPLATES[0],
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

  // Pre-fill from template when selected
  useEffect(() => {
    setName(selectedTemplate.suggestedName);
    setEmoji(selectedTemplate.emoji);
    setPersonality(selectedTemplate.personalityPrompt);
    setJob(selectedTemplate.jobPromptExample);
    setTools(selectedTemplate.recommendedTools);
    setFrequency(selectedTemplate.defaultFrequencySeconds);
  }, [selectedTemplate]);

  const canContinue = useMemo(() => {
    if (step === 0) return !!template;
    if (step === 1) return name.trim().length >= 2 && !!emoji && !!personality.trim();
    if (step === 2) return job.trim().length >= 5 && tools.length > 0;
    if (step === 3) return frequency >= 30;
    return false;
  }, [step, template, name, emoji, personality, job, tools, frequency]);

  const handleSpawn = async () => {
    if (vaults.length === 0) {
      setError("You need a device first. Create one at /vault/new.");
      return;
    }
    setSpawning(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: vaults[0].vault.id,
          template,
          name,
          emoji,
          personalityPrompt: personality,
          jobPrompt: job,
          allowedTools: tools,
          frequencySeconds: frequency,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.agent) {
        throw new Error(data.error ?? "spawn failed");
      }
      router.push(`/app/agents/${data.agent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "spawn failed");
      setSpawning(false);
    }
  };

  if (vaults.length === 0 && !isLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-[14px] text-[#6B6B6B] mb-3">
          You need a device before spawning agents.
        </p>
        <Link
          href="/vault/new"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[12px] text-[13px] font-semibold"
          style={{ background: "#0A0A0A", color: "#fff" }}
        >
          Create your device <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full"
            style={{ background: i <= step ? "#0A0A0A" : "#E5E7EB" }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0A0A0A] mb-1">
              Pick a template
            </h1>
            <p className="text-[13px] text-[#6B6B6B] mb-5">
              Each template comes with a starting personality, default tools, and frequency.
            </p>
            <div className="space-y-2">
              {ALL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className="w-full text-left rounded-[16px] p-4 transition-all active:scale-[0.99]"
                  style={{
                    background: "#fff",
                    border:
                      template === t.id
                        ? "1.5px solid #0A0A0A"
                        : "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[24px] shrink-0"
                      style={{ background: "#F5F5F5" }}
                    >
                      {t.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#0A0A0A]">{t.name}</p>
                        {t.id === "atlas" && (
                          <span
                            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "#F0FDF4", color: "#00A86B" }}
                          >
                            ORIGINAL
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#6B6B6B] mt-0.5 leading-[1.5]">
                        {t.description}
                      </p>
                    </div>
                    {template === t.id && (
                      <Check className="w-5 h-5 text-[#0A0A0A] shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0A0A0A] mb-1">
              Identity
            </h1>
            <p className="text-[13px] text-[#6B6B6B] mb-5">
              Give your agent a name, an emoji, and a personality.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#0A0A0A] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Percival"
                  className="w-full h-11 px-3 rounded-[10px] text-[14px] outline-none"
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0A0A0A] mb-1.5">
                  Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {["🔭", "📊", "🎯", "👋", "✨", "🤖", "🧭", "🦊", "🦉", "🐺", "🦅", "🐝"].map(
                    (e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[20px] transition-all active:scale-[0.95]"
                        style={{
                          background: emoji === e ? "#0A0A0A" : "#fff",
                          border:
                            emoji === e
                              ? "1.5px solid #0A0A0A"
                              : "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        {e}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#0A0A0A] mb-1.5">
                  Personality
                </label>
                <textarea
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none leading-[1.5] resize-none"
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
                <p className="text-[10px] text-[#9B9B9B] mt-1">
                  How your agent thinks and speaks. Edit freely.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0A0A0A] mb-1">
              Job & tools
            </h1>
            <p className="text-[13px] text-[#6B6B6B] mb-5">
              What should your agent do? What can it use?
            </p>

            <div>
              <label className="block text-[12px] font-medium text-[#0A0A0A] mb-1.5">
                Job description
              </label>

              {selectedTemplate.jobSuggestions.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] uppercase tracking-wide text-[#6B6B6B] mb-1.5">
                    Tap to use a suggested job
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.jobSuggestions.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setJob(s.job)}
                        className="text-[11px] px-2.5 py-1 rounded-full transition active:scale-[0.97]"
                        style={{
                          background: "#fff",
                          border: "1px solid rgba(0,0,0,0.1)",
                          color: "#0A0A0A",
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                value={job}
                onChange={(e) => setJob(e.target.value)}
                rows={5}
                placeholder={selectedTemplate.jobPromptPlaceholder}
                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none leading-[1.5] resize-none"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
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
                  <strong>That looks like an Ethereum address (0x…).</strong> Workers run on Solana — wallets here are base58 (e.g. <span className="font-mono">7Yk8cPDKL5h4QnQiVhHcvWg9HXKJpQfTmnK9zTzk5bWqA</span>). If you mean a Solana wallet, replace the 0x… address before spawning, or your worker will loop asking for a Solana address.
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#8B8B8B]">
                <Zap className="w-2.5 h-2.5" />
                <span>
                  Powered by Kyvern AI — your agent thinks at no cost to you during
                  the demo.
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[12px] font-medium text-[#0A0A0A] mb-2">
                Tools
                <span className="ml-2 text-[10px] font-normal text-[#6B6B6B]">
                  Recommended for {selectedTemplate.name} are pre-selected
                </span>
              </label>
              <div className="space-y-1.5">
                {[...allTools]
                  .sort((a, b) => {
                    const ar = selectedTemplate.recommendedTools.includes(a.id) ? 0 : 1;
                    const br = selectedTemplate.recommendedTools.includes(b.id) ? 0 : 1;
                    return ar - br;
                  })
                  .map((t) => {
                  const active = tools.includes(t.id);
                  const recommended = selectedTemplate.recommendedTools.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        setTools((prev) =>
                          active ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                        )
                      }
                      className="w-full text-left rounded-[12px] p-3 transition-all active:scale-[0.99]"
                      style={{
                        background: "#fff",
                        border: active
                          ? "1.5px solid #0A0A0A"
                          : "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: active ? "#0A0A0A" : "#fff",
                            border: active ? "none" : "1.5px solid rgba(0,0,0,0.15)",
                          }}
                        >
                          {active && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-medium text-[#0A0A0A]">
                              {t.name}
                            </p>
                            {recommended && (
                              <span
                                className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                                style={{ background: "#EEF2FF", color: "#4338CA" }}
                              >
                                RECOMMENDED
                              </span>
                            )}
                            {t.costsMoney && (
                              <span
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                                style={{ background: "#FEF3C7", color: "#D97706" }}
                              >
                                COSTS USDC
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-[1.4]">
                            {t.description.slice(0, 140)}
                            {t.description.length > 140 ? "…" : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0A0A0A] mb-1">
              Boundaries
            </h1>
            <p className="text-[13px] text-[#6B6B6B] mb-5">
              How often should your agent think? Money limits come from your device&apos;s policy.
            </p>

            <div className="rounded-[16px] p-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
              <label className="block text-[12px] font-medium text-[#0A0A0A] mb-2">
                Tick frequency
              </label>
              <input
                type="range"
                min={30}
                max={600}
                step={30}
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full accent-[#0A0A0A]"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[#9B9B9B]">30s</span>
                <span className="text-[14px] font-mono font-semibold text-[#0A0A0A]">
                  every {frequency}s
                </span>
                <span className="text-[10px] text-[#9B9B9B]">10m</span>
              </div>
            </div>

            {/* Review */}
            <div className="mt-5 rounded-[16px] p-4 space-y-2.5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9B9B9B] mb-2">
                Review
              </p>
              <ReviewRow label="Template" value={selectedTemplate.name} />
              <ReviewRow label="Name" value={`${emoji} ${name}`} />
              <ReviewRow label="Tools" value={`${tools.length} selected`} />
              <ReviewRow label="Frequency" value={`every ${frequency}s`} />
              {vaults[0] && (
                <ReviewRow label="Device" value={`${vaults[0].vault.emoji} ${vaults[0].vault.name}`} />
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-[10px] p-3 text-[12px]"
                style={{ background: "#FEF2F2", color: "#D92D20", border: "1px solid rgba(217,45,32,0.15)" }}>
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky footer */}
      <div className="fixed bottom-[72px] inset-x-0 z-40 px-5 sm:px-8 max-w-[680px] mx-auto">
        <div
          className="flex items-center gap-2 rounded-[16px] p-2"
          style={{
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="h-10 px-4 rounded-[10px] text-[13px] font-medium"
              style={{ background: "#F5F5F5", color: "#6B6B6B" }}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
              className="flex-1 h-10 rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-30"
              style={{ background: "#0A0A0A", color: "#fff" }}
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSpawn}
              disabled={!canContinue || spawning}
              className="flex-1 h-10 rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-30"
              style={{ background: "#0A0A0A", color: "#fff" }}
            >
              {spawning ? (
                <motion.span
                  className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {spawning ? "Spawning..." : "Spawn agent"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#6B6B6B]">{label}</span>
      <span className="text-[12px] font-medium text-[#0A0A0A]">{value}</span>
    </div>
  );
}
