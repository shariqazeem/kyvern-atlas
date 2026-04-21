import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/vault-store";
import { ensureVaultUsdcAta } from "@/lib/squads-v4";

/**
 * GET /api/vault/:id/funding
 *
 * Returns the info the on-page "Fund your vault" widget needs:
 *   - vault PDA + USDC ATA (created on demand, idempotent)
 *   - live USDC balance of the ATA
 *   - Circle faucet URL
 *
 * Separate from the base vault route so the widget can poll this every
 * few seconds for live balance updates without re-fetching the whole
 * dashboard.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { error: "vault_not_found" },
      { status: 404 },
    );
  }

  // Ensure the ATA exists (idempotent — free no-op after first call).
  let ataInfo: Awaited<ReturnType<typeof ensureVaultUsdcAta>>;
  try {
    ataInfo = await ensureVaultUsdcAta({
      smartAccountAddress: vault.squadsAddress,
      network: vault.network,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "ata_prep_failed",
        message:
          e instanceof Error ? e.message : "could not derive vault USDC ATA",
      },
      { status: 500 },
    );
  }

  // Read live USDC balance from RPC. Lazily imported so the route stays
  // lightweight when the ATA flow is in stub mode.
  let balanceUsdc: number | null = null;
  let balanceError: string | null = null;
  try {
    const [{ Connection, PublicKey }, { rpcUrl }] = await Promise.all([
      import("@solana/web3.js"),
      import("@/lib/solana-keystore"),
    ]);
    const conn = new Connection(rpcUrl(vault.network), "confirmed");
    const bal = await conn.getTokenAccountBalance(
      new PublicKey(ataInfo.vaultAta),
    );
    balanceUsdc = Number(bal.value.uiAmount ?? 0);
  } catch (e) {
    // Expected when the ATA has zero balance and has never received
    // tokens — the account exists but RPC returns an error until any
    // deposit lands. We surface null balance and let the UI render "$0".
    balanceError = e instanceof Error ? e.message : "unknown RPC error";
    balanceUsdc = 0;
  }

  return NextResponse.json({
    vaultId: vault.id,
    network: vault.network,
    vaultPda: ataInfo.vaultPda,
    usdcAta: ataInfo.vaultAta,
    usdcMint: ataInfo.usdcMint,
    balanceUsdc,
    balanceError,
    ataExplorerUrl: `https://explorer.solana.com/address/${ataInfo.vaultAta}?cluster=${vault.network}`,
    faucetUrl: "https://faucet.circle.com/",
  });
}
