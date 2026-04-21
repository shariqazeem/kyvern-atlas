"use client";

/**
 * <IntegrateTab/> — SDK snippet + live playground together.
 *
 * This is where a dev lands when they want to wire Kyvern into their
 * agent code. The snippet card shows a copy-ready SDK usage example,
 * the playground lets them fire a test payment from the browser to
 * verify the wiring before they go to production.
 *
 * Thin tab — both children already exist as premium components. We
 * just frame them inside the tab with a consistent header strip.
 */

import { AgentSnippetCard } from "@/components/vault/agent-snippet-card";
import { VaultPlayground } from "@/components/vault/playground";
import type { Vault } from "../types";

export interface IntegrateTabProps {
  vault: Vault;
  onAfterAction?: () => void;
}

export function IntegrateTab({ vault, onAfterAction }: IntegrateTabProps) {
  return (
    <div className="space-y-4">
      <VaultPlayground
        vaultId={vault.id}
        network={vault.network}
        agentKey={null}
        allowedMerchants={vault.allowedMerchants}
        perTxMaxUsd={vault.perTxMaxUsd}
        requireMemo={vault.requireMemo}
        onAfterCall={onAfterAction}
      />
      <AgentSnippetCard vault={vault} />
    </div>
  );
}
