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
 * The agent moves $0.01–$0.05 from its vault to the platform treasury
 * with a memo identifying the finding. Phase 1 doesn't have payout
 * logic for stakes — the act of staking is the on-chain proof of
 * conviction. Future phases can build prediction-market style payouts
 * on top.
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
  name: "Stake USDC on a finding",
  description:
    "Move $0.01–$0.05 to the platform treasury as on-chain proof of conviction in a finding you've surfaced. Specify the finding subject (matches one of your recent signals) and the stake amount. Use sparingly — this is real USDC.",
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

    const memo = `KVN stake: ${findingSubject.slice(0, 80)}`;
    const stake = await serverVaultPay({
      vaultId: ctx.agent.deviceId,
      merchant: "kyvern.stake",
      recipientPubkey,
      amountUsd: stakeAmount,
      memo,
      logEvent: {
        eventType: "spending_sent",
        abilityId: "stake_on_finding",
        counterparty: "🏛️ Kyvern Treasury",
        description: `Staked $${stakeAmount.toFixed(3)} on "${findingSubject.slice(0, 60)}"`,
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
      description: `Staked $${stakeAmount.toFixed(3)} on "${findingSubject.slice(0, 50)}"`,
      signature: stake.signature,
      amountUsd: stakeAmount,
      counterparty: "🏛️ Kyvern Treasury",
      eventType: "spending_sent",
    });

    return {
      ok: true,
      message: `Staked $${stakeAmount.toFixed(3)} (${stake.signature.slice(0, 10)}…). ${reasoning}`,
      signature: stake.signature,
      amountUsd: stakeAmount,
      counterparty: "Kyvern Treasury",
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
