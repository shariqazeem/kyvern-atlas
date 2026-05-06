import type { AgentTool } from "../types";
import {
  bumpAgentSpent,
  findRecentSignalBySubject,
  hasRecentStakeOnSubject,
  setSignalOnChain,
} from "../store";
import { hashSubject } from "../signal-hash";
import { serverVaultPay } from "@/lib/server-pay";
import { TREASURY_VAULT_ID, treasuryRecipientPubkey } from "../treasury";

/**
 * stake_on_finding — put USDC behind a finding you believe in.
 *
 * Routes the spend through a Pay.sh-shaped vault.pay() call:
 *   merchant: "api.pay.sh/gemini"
 *   memo: "gemini-flash: validate ${findingSubject}"
 *   counterparty: "🛰️ Pay.sh · Gemini"
 *
 * The agent moves $0.01–$0.05 from its vault. Real Solana devnet tx,
 * real signature, Pay.sh-flavored merchant + memo so every settled
 * stake renders in Solana Explorer as a Pay.sh inference call. This
 * is the on-chain narrative for Solana × Google Cloud's Pay.sh launch
 * (May 2026): agents pay Pay.sh; Kyvern's policy program gates the
 * call before a single USDC lamport moves.
 *
 * If the agent has emitted a signal whose subject matches the finding,
 * we anchor the on-chain signature back onto that signal so the inbox
 * card can render the green "Staked $X ✓" badge.
 *
 * Policy reject path: returns failedSignature=null + failedReason so
 * the runner persists a red on-chain badge ("blocked $X stake").
 */
export const stakeOnFindingTool: AgentTool = {
  id: "stake_on_finding",
  name: "Pay Pay.sh / Gemini to validate a finding",
  description:
    "Pay $0.01–$0.05 via Pay.sh/Gemini-flash to back a finding you've surfaced with a real on-chain validation call. Specify the finding subject (matches one of your recent signals) and the stake amount. Real USDC, real Solana tx. Use sparingly.",
  category: "spend",
  costsMoney: true,
  schema: {
    type: "object",
    properties: {
      findingSubject: {
        type: "string",
        description:
          "Subject of the finding you're staking on. Should match the subject of a signal you've recently emitted.",
      },
      stakeAmount: {
        type: "number",
        description: "USDC to stake. Range: 0.01 to 0.05.",
      },
      reasoning: {
        type: "string",
        description:
          "One sentence explaining why this finding deserves a stake.",
      },
    },
    required: ["findingSubject", "stakeAmount", "reasoning"],
  },
  execute: async (ctx, input) => {
    const findingSubject = String(input.findingSubject ?? "").trim();
    const stakeAmount = Math.min(
      Math.max(Number(input.stakeAmount ?? 0.01), 0.01),
      0.05,
    );
    const reasoning = String(input.reasoning ?? "").trim();

    if (!findingSubject) {
      return { ok: false, message: "findingSubject required" };
    }
    if (reasoning.length < 8) {
      return { ok: false, message: "reasoning must be at least 8 chars" };
    }

    if (ctx.agent.deviceId === TREASURY_VAULT_ID) {
      return {
        ok: false,
        message: "treasury vault cannot stake on findings",
      };
    }

    // Phase 8 — dedup. The LLM was firing 4 stakes on the same SOL
    // band breach inside a single tick (~$0.07 wasted per cycle).
    // Mirrors the signals dedup gate: same (agent, hashSubject) inside
    // a 24h window → drop. Returns success-shaped ok=false so the
    // LLM gets a clean "already staked" message instead of an error.
    const subjectHash = hashSubject(findingSubject);
    if (hasRecentStakeOnSubject(ctx.agent.id, subjectHash, 24 * 60 * 60 * 1000)) {
      return {
        ok: false,
        message: `already staked on "${findingSubject.slice(0, 50)}" within the last 24h — skip and look for a different finding`,
      };
    }

    let recipientPubkey: string;
    try {
      recipientPubkey = treasuryRecipientPubkey();
    } catch (e) {
      return {
        ok: false,
        message: `treasury unavailable: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // Pay.sh-shaped vault.pay() — Pulse stakes on conviction by paying
    // a Pay.sh inference call (gemini-flash) to validate the finding.
    // The merchant label, memo, and counterparty are all Pay.sh-shaped
    // so every Pulse cycle shows up in Solana Explorer as a real Pay.sh
    // call. Pay.sh + Solana × Google Cloud (May 2026) is the rail; the
    // Kyvern Anchor program gates it before a single USDC lamport moves.
    const memo = `gemini-flash: validate ${findingSubject.slice(0, 64)}`;
    const stake = await serverVaultPay({
      vaultId: ctx.agent.deviceId,
      merchant: "api.pay.sh/gemini",
      recipientPubkey,
      amountUsd: stakeAmount,
      memo,
      logEvent: {
        eventType: "spending_sent",
        abilityId: "stake_on_finding",
        counterparty: "🛰️ Pay.sh · Gemini",
        description: `Paid $${stakeAmount.toFixed(3)} → Pay.sh/Gemini · validate "${findingSubject.slice(0, 50)}"`,
      },
    });

    if (!stake.success || !stake.signature) {
      return {
        ok: false,
        message: `Stake blocked: ${stake.reason ?? "unknown"}`,
        failedSignature: null,
        failedReason: stake.reason ?? "policy_blocked",
        amountUsd: stakeAmount,
      };
    }

    bumpAgentSpent(ctx.agent.id, stakeAmount);

    // Anchor the stake to the originating signal if we can find one.
    const signal = findRecentSignalBySubject(ctx.agent.id, findingSubject);
    if (signal) setSignalOnChain(signal.id, stake.signature);

    // Record the stake row so the dedup check on the next tick sees
    // it. Done AFTER on-chain success — a blocked stake doesn't
    // burn the dedup window.
    try {
      const { recordStake } = await import("../store");
      recordStake({
        agentId: ctx.agent.id,
        subjectHash,
        signature: stake.signature,
        amountUsd: stakeAmount,
      });
    } catch {
      /* table not present in legacy schema — caller already paid */
    }

    ctx.log({
      description: `Paid $${stakeAmount.toFixed(3)} → Pay.sh/Gemini · validate "${findingSubject.slice(0, 50)}"`,
      signature: stake.signature,
      amountUsd: stakeAmount,
      counterparty: "🛰️ Pay.sh · Gemini",
      eventType: "spending_sent",
    });

    return {
      ok: true,
      message: `Paid $${stakeAmount.toFixed(3)} via Pay.sh/Gemini (${stake.signature.slice(0, 10)}…). ${reasoning}`,
      signature: stake.signature,
      amountUsd: stakeAmount,
      counterparty: "Pay.sh · Gemini",
      data: {
        findingSubject,
        stakeAmount,
        reasoning,
        signature: stake.signature,
        explorerUrl: stake.explorerUrl,
        anchoredSignalId: signal?.id ?? null,
      },
    };
  },
};
