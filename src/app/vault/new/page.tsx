"use client";

/* ════════════════════════════════════════════════════════════════════
   /vault/new — cinematic 5-step onboarding

   Wiring:
   · Steps 1-3 edit a local VaultConfig
   · Step 4 POSTs to /api/vault/create → receives { vault, squads, agentKey }
   · Step 5 shows the vault id + one-time agent key
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlowShell } from "@/components/vault/flow-shell";
import { IdentityStep } from "@/components/vault/steps/identity";
import { BudgetsStep } from "@/components/vault/steps/budgets";
import { PoliciesStep } from "@/components/vault/steps/policies";
import { ReviewStep } from "@/components/vault/steps/review";
import { SuccessStep } from "@/components/vault/steps/success";
import { TemplateChooser } from "@/components/vault/steps/template-chooser";
import {
  ATLAS_TEMPLATE,
  DEFAULT_CONFIG,
  type VaultConfig,
} from "@/components/vault/types";
import { useAuth } from "@/hooks/use-auth";

const STEP_COUNT = 5;

// Minimum time (ms) we hold on the review screen so the Squads animation
// can actually play — even if the API returns in 50ms.
const MIN_DEPLOY_MS = 1600;

export default function NewVaultPage() {
  const router = useRouter();
  const { wallet } = useAuth();

  // Two entry paths: (a) Clone Atlas — pre-fill the same config our
  // reference autonomous agent runs on, jump straight to Review.
  // (b) Build from scratch — the full 5-step wizard.
  // A null `entry` means the user hasn't made that choice yet and we
  // render the TemplateChooser landing instead of the wizard chrome.
  const [entry, setEntry] = useState<"clone" | "scratch" | null>(null);
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<VaultConfig>(DEFAULT_CONFIG);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{
    vaultId: string;
    agentKey: string;
    squads?: {
      mode: "real" | "stub";
      smartAccountAddress: string;
      smartAccountExplorerUrl: string;
      vaultPdaExplorerUrl: string;
      spendingLimitExplorerUrl: string;
      createSignature: string;
    };
  } | null>(null);

  const updateConfig = useCallback(
    (updater: (c: VaultConfig) => VaultConfig) => setConfig(updater),
    [],
  );

  const canContinue = useMemo(() => {
    if (isDeploying) return false;
    if (step === 0) return config.name.trim().length >= 2;
    if (step === 1)
      return (
        config.dailyLimit > 0 &&
        config.weeklyLimit >= config.dailyLimit &&
        config.perTxMax > 0 &&
        config.perTxMax <= config.dailyLimit
      );
    if (step === 2) return config.maxCallsPerWindow > 0;
    if (step === 3) return true;
    if (step === 4) return true;
    return false;
  }, [step, config, isDeploying]);

  const onBack = step > 0 && step < 4 ? () => setStep((s) => s - 1) : undefined;

  const deployVault = useCallback(async () => {
    setDeployError(null);

    // Must have a real Solana pubkey from Privy. Previously this fell
    // back to a random base58-shaped string, which looked valid to our
    // client but wasn't a real ED25519 public key — Squads v4 accepted
    // it as a "member" but the subsequent spending-limit flow failed,
    // surfacing as an opaque 502 in the browser. Guard hard instead.
    const ownerWallet = wallet ?? maybeDevFallbackWallet();
    if (!ownerWallet) {
      setDeployError(
        "No Solana wallet connected. Sign in again to continue.",
      );
      return;
    }

    setIsDeploying(true);
    const startedAt = Date.now();

    try {
      const res = await fetch("/api/vault/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerWallet,
          name: config.name.trim(),
          emoji: config.emoji,
          purpose: config.purpose,
          dailyLimitUsd: config.dailyLimit,
          weeklyLimitUsd: config.weeklyLimit,
          perTxMaxUsd: config.perTxMax,
          maxCallsPerWindow: config.maxCallsPerWindow,
          velocityWindow: config.velocityWindow,
          allowedMerchants: config.allowedMerchants,
          requireMemo: config.requireMemo,
          network: config.network,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          (Array.isArray(data?.errors) && data.errors.join(" · ")) ||
          data?.message ||
          data?.error ||
          `deploy failed (${res.status})`;
        throw new Error(message);
      }

      // Hold for at least MIN_DEPLOY_MS so the "Signing…" animation plays.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_DEPLOY_MS) {
        await new Promise((r) => setTimeout(r, MIN_DEPLOY_MS - elapsed));
      }

      setDeployResult({
        vaultId: data.vault?.id ?? data.squads?.smartAccountAddress ?? "vlt_unknown",
        agentKey: data.agentKey?.raw ?? "",
        squads: data.squads
          ? {
              mode: data.squads.mode,
              smartAccountAddress: data.squads.smartAccountAddress,
              smartAccountExplorerUrl: data.squads.smartAccountExplorerUrl,
              vaultPdaExplorerUrl: data.squads.vaultPdaExplorerUrl,
              spendingLimitExplorerUrl: data.squads.spendingLimitExplorerUrl,
              createSignature: data.squads.createSignature,
            }
          : undefined,
      });
      setStep(4);
    } catch (e) {
      setDeployError(
        e instanceof Error ? e.message : "deploy failed — please try again",
      );
    } finally {
      setIsDeploying(false);
    }
  }, [wallet, config]);

  const onContinue = useCallback(() => {
    if (isDeploying) return;
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    if (step === 3) {
      void deployVault();
      return;
    }
    // Step 4 — finish
    if (deployResult) {
      router.push(`/vault/${deployResult.vaultId}`);
    }
  }, [step, isDeploying, deployResult, router, deployVault]);

  const title = useMemo(() => {
    switch (step) {
      case 0:
        return "Name your agent.";
      case 1:
        return "Set its budget.";
      case 2:
        return "Pre-approve its world.";
      case 3:
        return isDeploying ? "Deploying on Solana." : "Review and release.";
      case 4:
        return "Your agent is running.";
      default:
        return "";
    }
  }, [step, isDeploying]);

  const subtitle = useMemo(() => {
    switch (step) {
      case 0:
        return "One agent, one job, one set of rules enforced on-chain.";
      case 1:
        return "Hard ceilings the chain respects. Your agent can't argue with math.";
      case 2:
        return "Who your agent can pay, and how often. Everything outside this set is refused at consensus.";
      case 3:
        if (deployError) return deployError;
        return isDeploying
          ? "Squads is creating the multisig and delegating the spending limit to your agent."
          : "One last look. Nothing signs until you deploy.";
      case 4:
        return "Copy the key, paste the snippet, let it run.";
      default:
        return "";
    }
  }, [step, isDeploying, deployError]);

  const eyebrow =
    step === 4
      ? "Deployed"
      : step === 3 && isDeploying
        ? "Signing…"
        : `Step ${String(step + 1).padStart(2, "0")}`;

  const continueLabel = useMemo(() => {
    if (step === 3) {
      if (isDeploying) return "Signing…";
      if (deployError) return "Try again";
      return "Deploy agent";
    }
    if (step === 4) return "Open agent dashboard";
    return "Continue";
  }, [step, isDeploying, deployError]);

  // Template chooser lives OUTSIDE the FlowShell chrome — it's the
  // "pre-wizard" decision point. Only after the user picks a path do
  // we mount the multi-step FlowShell.
  if (entry === null) {
    return (
      <TemplateChooser
        onCloneAtlas={() => {
          setConfig(ATLAS_TEMPLATE);
          setEntry("clone");
          // Jump straight to the Review step — nothing to customize.
          setStep(3);
        }}
        onStartFresh={() => {
          setConfig(DEFAULT_CONFIG);
          setEntry("scratch");
          setStep(0);
        }}
      />
    );
  }

  return (
    <FlowShell
      stepIndex={step}
      stepCount={STEP_COUNT}
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      canContinue={canContinue}
      continueLabel={continueLabel}
      onBack={onBack}
      onContinue={onContinue}
    >
      {step === 0 && <IdentityStep config={config} setConfig={updateConfig} />}
      {step === 1 && <BudgetsStep config={config} setConfig={updateConfig} />}
      {step === 2 && <PoliciesStep config={config} setConfig={updateConfig} />}
      {step === 3 && (
        <ReviewStep
          config={config}
          setConfig={updateConfig}
          isDeploying={isDeploying}
        />
      )}
      {step === 4 && deployResult && (
        <SuccessStep
          config={config}
          vaultId={deployResult.vaultId}
          agentKey={deployResult.agentKey}
          squads={deployResult.squads}
        />
      )}
    </FlowShell>
  );
}

/* ─── Dev fallback owner wallet — ONLY on localhost ───
   Previously this returned a random base58 string for any environment
   when Privy wasn't connected. That generated fake "pubkeys" that
   weren't real ED25519 keys — Squads accepted them as members, but
   the spending-limit flow downstream failed, producing unhelpful 502s.

   Now we only return a fallback when running on 127.0.0.1/localhost
   (real local dev without Privy keys), and we use a well-known
   FIXED valid pubkey the user can share — never a random string. */
function maybeDevFallbackWallet(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local");
  if (!isLocal) return null;
  // SystemProgram is valid as "a Solana pubkey shape" — it's the
  // 11111111111111111111111111111111 system program id. It will fail
  // a real on-chain flow but lets devs click through without a wallet.
  return "11111111111111111111111111111111";
}
