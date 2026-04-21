import { NextRequest, NextResponse } from "next/server";
import {
  getVaultsByOwner,
  getSpendSnapshot,
  listPayments,
  type VaultRecord,
} from "@/lib/vault-store";

/* ════════════════════════════════════════════════════════════════════
   GET /api/vault/list?ownerWallet=<pubkey>

   Returns every vault owned by `ownerWallet`, enriched with a light
   spend snapshot + last-payment preview so the /vault list page can
   render cards in one round-trip (no N+1 fetch per card).

   Response shape:
   {
     vaults: Array<{
       vault:       VaultRecord,
       budget: {
         dailyLimitUsd, weeklyLimitUsd,
         spentToday, spentThisWeek,
         dailyUtilization, weeklyUtilization
       },
       lastPayment: {
         merchant, amountUsd, status, createdAt
       } | null
     }>,
     total: number
   }
   ════════════════════════════════════════════════════════════════════ */

export interface VaultListEntry {
  vault: VaultRecord;
  budget: {
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
    spentToday: number;
    spentThisWeek: number;
    dailyUtilization: number;
    weeklyUtilization: number;
  };
  lastPayment: {
    merchant: string;
    amountUsd: number;
    status: "allowed" | "blocked" | "settled" | "failed";
    createdAt: string;
  } | null;
}

export async function GET(req: NextRequest) {
  const ownerWallet = req.nextUrl.searchParams.get("ownerWallet");
  if (!ownerWallet || typeof ownerWallet !== "string" || ownerWallet.trim().length < 2) {
    return NextResponse.json(
      { error: "missing_owner_wallet", message: "ownerWallet query param is required" },
      { status: 400 },
    );
  }

  const vaults = getVaultsByOwner(ownerWallet);

  const entries: VaultListEntry[] = vaults.map((vault) => {
    const snap = getSpendSnapshot(vault.id, vault.velocityWindow);
    const recent = listPayments(vault.id, 1);
    const last = recent[0] ?? null;
    return {
      vault,
      budget: {
        dailyLimitUsd: vault.dailyLimitUsd,
        weeklyLimitUsd: vault.weeklyLimitUsd,
        spentToday: snap.spentToday,
        spentThisWeek: snap.spentThisWeek,
        dailyUtilization:
          vault.dailyLimitUsd > 0
            ? Math.min(1, snap.spentToday / vault.dailyLimitUsd)
            : 0,
        weeklyUtilization:
          vault.weeklyLimitUsd > 0
            ? Math.min(1, snap.spentThisWeek / vault.weeklyLimitUsd)
            : 0,
      },
      lastPayment: last
        ? {
            merchant: last.merchant,
            amountUsd: last.amountUsd,
            status: last.status,
            createdAt: last.createdAt,
          }
        : null,
    };
  });

  return NextResponse.json(
    { vaults: entries, total: entries.length },
    { status: 200 },
  );
}
