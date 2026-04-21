/* ════════════════════════════════════════════════════════════════════
   demo-runner.ts — executes a DemoScript against the REAL stack
   ────────────────────────────────────────────────────────────────────
   One run per demo session. Walks the script step-by-step, and for
   every `call` step actually:
     · runs the live policy engine against the current vault state
     · fires Squads v4 `spendingLimitUse` on devnet when allowed
     · records the payment in the same ledger the owner dashboard reads

   Every state transition emits events into the demo-session bus, which
   the SSE route fans out to connected browsers.

   This is the heart of the "it's real, watch" promise. The only thing
   scripted is the sequence + the agent's narration. The money, the
   policy, the signatures — all live.
   ════════════════════════════════════════════════════════════════════ */

import {
  getVault,
  getSpendSnapshot,
  recordPayment,
  touchAgentKey,
  resolveAgentKey,
  getAgentKeySolana,
  type VaultRecord,
} from "./vault-store";
import { evaluatePayment, normalizeMerchant } from "./policy-engine";
import { coSignPayment, isSquadsReal } from "./squads-v4";
import { emit, markRunning, setAbort, getSession } from "./demo-session";
import type { DemoScript, DemoStep } from "./demo-script";

/* ─── Helper: schedule with cancellation ─── */

function sleep(ms: number, ac: AbortController): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    ac.signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}

/* ─── Emit a budget snapshot ─── */

function emitBudget(sessionId: string, vault: VaultRecord) {
  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);
  emit(sessionId, "budget", {
    vaultId: vault.id,
    dailyLimitUsd: vault.dailyLimitUsd,
    weeklyLimitUsd: vault.weeklyLimitUsd,
    perTxMaxUsd: vault.perTxMaxUsd,
    maxCallsPerWindow: vault.maxCallsPerWindow,
    velocityWindow: vault.velocityWindow,
    spentToday: snapshot.spentToday,
    spentThisWeek: snapshot.spentThisWeek,
    callsInWindow: snapshot.callsInWindow,
  });
}

/* ─── The pay path, reproduced here so we can emit events between steps ─── */

async function runCall(params: {
  sessionId: string;
  vault: VaultRecord;
  step: DemoStep;
  agentKeyId: string;
}): Promise<void> {
  const { sessionId, vault, step, agentKeyId } = params;
  const t0 = Date.now();

  const merchant = step.merchant ?? "";
  const amountUsd = step.amountUsd ?? 0;
  const memo = step.memo ?? null;
  const recipientPubkey =
    step.recipientPubkey ?? "8ZVR3mF6v9ZK3Y9DqxLTmZxSJMa4j8TFhB8zNGJCuYMH";

  // 1) Announce the attempt so the UI can show "The Wall" pulsing
  //    before the decision lands.
  emit(sessionId, "attempt", {
    merchant,
    amountUsd,
    memo,
    expected: step.expected,
  });

  // 2) Evaluate policy — live.
  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);
  const decision = evaluatePayment(
    { vault, snapshot },
    { merchant, amountUsd, memo },
  );

  const merchantForLog = normalizeMerchant(merchant) ?? merchant;

  // 3) Emit the policy result with per-rule detail so the UI can render
  //    five green ticks or the one red X.
  emit(sessionId, "policy", {
    decision: decision.decision,
    code: decision.code,
    reason: decision.reason,
    budget: decision.budget,
    velocity: decision.velocity,
  });

  touchAgentKey(agentKeyId);

  if (decision.decision === "blocked") {
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId,
      merchant: merchantForLog,
      amountUsd,
      memo,
      status: "blocked",
      reason: decision.reason ?? decision.code ?? "blocked",
      txSignature: null,
      latencyMs,
    });
    emit(sessionId, "blocked", {
      payment,
      code: decision.code,
      reason: decision.reason,
    });
    emitBudget(sessionId, vault);
    return;
  }

  // 4) Allowed → start signing. Tell the UI so the signing shimmer plays.
  emit(sessionId, "signing", { merchant: merchantForLog, amountUsd });

  const agentSolana = getAgentKeySolana(agentKeyId);
  const spendingLimitPda = vault.spendingLimitPda;

  if (isSquadsReal() && (!agentSolana || !spendingLimitPda)) {
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId,
      merchant: merchantForLog,
      amountUsd,
      memo,
      status: "failed",
      reason:
        "demo vault missing on-chain state — rerun bootstrap-solana-signer",
      txSignature: null,
      latencyMs,
    });
    emit(sessionId, "failed", {
      payment,
      message: "demo vault missing on-chain state",
    });
    emitBudget(sessionId, vault);
    return;
  }

  try {
    const cosign = await coSignPayment({
      smartAccountAddress: vault.squadsAddress,
      spendingLimitPda: spendingLimitPda ?? "",
      agentSecretB58: agentSolana?.secretB58 ?? "",
      merchant: merchantForLog,
      recipientPubkey,
      amountUsd,
      memo,
      network: vault.network,
    });
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId,
      merchant: merchantForLog,
      amountUsd,
      memo,
      status: "settled",
      reason: null,
      txSignature: cosign.txSignature,
      latencyMs,
    });
    emit(sessionId, "settled", {
      payment,
      tx: {
        signature: cosign.txSignature,
        explorerUrl: cosign.explorerUrl,
      },
    });
    emitBudget(sessionId, vault);
  } catch (e) {
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId,
      merchant: merchantForLog,
      amountUsd,
      memo,
      status: "failed",
      reason: e instanceof Error ? e.message : "squads co-sign failed",
      txSignature: null,
      latencyMs,
    });
    emit(sessionId, "failed", {
      payment,
      message: e instanceof Error ? e.message : "squads co-sign failed",
    });
    emitBudget(sessionId, vault);
  }
}

/* ─── The public entry point ─── */

export async function runDemo(params: {
  sessionId: string;
  vaultId: string;
  agentKeyRaw: string;
  script: DemoScript;
}): Promise<void> {
  const { sessionId, vaultId, agentKeyRaw, script } = params;

  const vault = getVault(vaultId);
  if (!vault) {
    emit(sessionId, "error", { message: "demo vault not found" });
    return;
  }

  const resolved = resolveAgentKey(agentKeyRaw);
  if (!resolved) {
    emit(sessionId, "error", { message: "demo agent key invalid" });
    return;
  }

  const ac = new AbortController();
  setAbort(sessionId, () => ac.abort());
  markRunning(sessionId);

  // Kick off: announce the scenario + the counterfactual + initial budget.
  emit(sessionId, "narrative", {
    agent: script.agent,
    counterfactual: script.counterfactual,
    vault: {
      id: vault.id,
      name: vault.name,
      network: vault.network,
      squadsAddress: vault.squadsAddress,
      allowedMerchants: vault.allowedMerchants,
      dailyLimitUsd: vault.dailyLimitUsd,
      perTxMaxUsd: vault.perTxMaxUsd,
    },
  });
  emitBudget(sessionId, vault);

  try {
    for (const step of script.steps) {
      await sleep(Math.max(0, step.delayMs), ac);

      switch (step.phase) {
        case "narrative":
          emit(sessionId, "narrative", { message: step.message });
          break;
        case "think":
          emit(sessionId, "think", { message: step.message });
          break;
        case "pause":
          emit(sessionId, "pause", {});
          break;
        case "call": {
          // Re-read the vault between steps in case the dashboard has
          // paused it mid-run — the policy engine should reflect that.
          const fresh = getVault(vault.id) ?? vault;
          await runCall({
            sessionId,
            vault: fresh,
            step,
            agentKeyId: resolved.keyId,
          });
          break;
        }
        case "summary":
          emit(sessionId, "summary", { message: step.message });
          break;
      }

      // After every step, double-check the session wasn't evicted.
      if (!getSession(sessionId)) return;
    }

    emit(sessionId, "end", {
      vaultId: vault.id,
      totalSteps: script.steps.length,
    });
  } catch (e) {
    if (ac.signal.aborted) {
      emit(sessionId, "end", { aborted: true });
      return;
    }
    emit(sessionId, "error", {
      message: e instanceof Error ? e.message : "demo runner failed",
    });
  }
}
