import { NextRequest, NextResponse } from "next/server";
import {
  createVault,
  issueAgentKey,
  setVaultSquadsState,
  type VelocityWindow,
} from "@/lib/vault-store";
import {
  createSmartAccount,
  setSpendingLimit,
  ensureVaultUsdcAta,
  isSquadsReal,
  explorerAddressUrl,
} from "@/lib/squads-v4";
import { generateAgentKeypair } from "@/lib/solana-keystore";

/* ════════════════════════════════════════════════════════════════════
   POST /api/vault/create

   Creates a Squads v4 smart account, delegates a spending limit to it,
   mints a server-signed agent key, and records everything in SQLite.

   Request body (JSON):
   {
     ownerWallet:        string,            // Solana base58 pubkey
     name:               string,
     emoji?:             string,
     purpose?:           string,
     dailyLimitUsd:      number,
     weeklyLimitUsd:     number,
     perTxMaxUsd:        number,
     maxCallsPerWindow:  number,
     velocityWindow:     '1h' | '1d' | '1w',
     allowedMerchants:   string[],
     requireMemo:        boolean,
     network:            'devnet' | 'mainnet'
   }

   Response:
   {
     vault: VaultRecord (no secrets),
     squads: { createSignature, spendingLimitPda, setSignature },
     agentKey: { id, prefix, raw }   // raw is only returned ONCE
   }
   ════════════════════════════════════════════════════════════════════ */

interface CreateVaultBody {
  ownerWallet?: string;
  name?: string;
  emoji?: string;
  purpose?: string;
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  perTxMaxUsd?: number;
  maxCallsPerWindow?: number;
  velocityWindow?: VelocityWindow;
  allowedMerchants?: string[];
  requireMemo?: boolean;
  network?: "devnet" | "mainnet";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function POST(req: NextRequest) {
  let body: CreateVaultBody;
  try {
    body = (await req.json()) as CreateVaultBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "body must be valid JSON" },
      { status: 400 },
    );
  }

  // ─── Validate ───
  const errors: string[] = [];
  if (!body.ownerWallet || typeof body.ownerWallet !== "string") {
    errors.push("ownerWallet is required");
  } else if (body.ownerWallet.startsWith("0x")) {
    // Guard: we had a real production bug where users signed in with Privy's
    // dual embedded wallets (EVM + Solana) and the client sent the EVM
    // address (0x…) instead of the Solana address. Squads v4 then crashed
    // deep inside create_smart_account with an opaque error that surfaced as
    // a 500 in the browser. Reject these explicitly at the edge.
    errors.push(
      "ownerWallet looks like an Ethereum address (0x…). Kyvern vaults live on Solana — reconnect with a Solana wallet (Phantom, Solflare) or use the embedded Solana wallet created on email/Google login.",
    );
  } else if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.ownerWallet)) {
    // Solana base58 pubkey check — alphabet excludes 0, O, I, l. Length is
    // almost always 43 or 44 chars for ED25519 pubkeys, but a handful of
    // well-known program IDs are 32. We stay permissive within that range
    // and let the downstream Squads call do the final cryptographic check.
    errors.push(
      "ownerWallet is not a valid Solana base58 pubkey",
    );
  }
  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2)
    errors.push("name must be at least 2 characters");
  if (!isFiniteNumber(body.dailyLimitUsd) || body.dailyLimitUsd <= 0)
    errors.push("dailyLimitUsd must be > 0");
  if (!isFiniteNumber(body.weeklyLimitUsd) || body.weeklyLimitUsd <= 0)
    errors.push("weeklyLimitUsd must be > 0");
  if (!isFiniteNumber(body.perTxMaxUsd) || body.perTxMaxUsd <= 0)
    errors.push("perTxMaxUsd must be > 0");
  if (isFiniteNumber(body.weeklyLimitUsd) && isFiniteNumber(body.dailyLimitUsd) && body.weeklyLimitUsd < body.dailyLimitUsd)
    errors.push("weeklyLimitUsd cannot be less than dailyLimitUsd");
  if (isFiniteNumber(body.perTxMaxUsd) && isFiniteNumber(body.dailyLimitUsd) && body.perTxMaxUsd > body.dailyLimitUsd)
    errors.push("perTxMaxUsd cannot exceed dailyLimitUsd");
  if (!isFiniteNumber(body.maxCallsPerWindow) || body.maxCallsPerWindow < 1)
    errors.push("maxCallsPerWindow must be >= 1");
  if (
    body.velocityWindow !== "1h" &&
    body.velocityWindow !== "1d" &&
    body.velocityWindow !== "1w"
  )
    errors.push("velocityWindow must be '1h', '1d', or '1w'");
  if (!Array.isArray(body.allowedMerchants))
    errors.push("allowedMerchants must be an array of strings");
  if (body.network !== "devnet" && body.network !== "mainnet")
    errors.push("network must be 'devnet' or 'mainnet'");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_error", errors },
      { status: 400 },
    );
  }

  // TS narrow
  const ownerWallet = body.ownerWallet!;
  const dailyLimitUsd = body.dailyLimitUsd!;
  const weeklyLimitUsd = body.weeklyLimitUsd!;
  const perTxMaxUsd = body.perTxMaxUsd!;
  const maxCallsPerWindow = body.maxCallsPerWindow!;
  const velocityWindow = body.velocityWindow!;
  const allowedMerchants = body.allowedMerchants!;
  const network = body.network!;

  // ─── 1. Generate the delegated Solana keypair for the agent ───
  // The Solana-side identity that the Squads spending limit will list as an
  // authorized `member`. The agent's bearer API key (kv_live_…) binds 1:1
  // to this keypair server-side via the vault_agent_keys row.
  const agentSolana = await generateAgentKeypair();

  // ─── 2. Create on-chain smart account via Squads v4 ───
  // confirmTransaction is awaited inside createSmartAccount; if the tx
  // does not actually land, this throws — no DB row is created.
  let smartAccount;
  try {
    smartAccount = await createSmartAccount({
      ownerPubkey: ownerWallet,
      vaultSeed: `${ownerWallet}::${body.name!.trim()}::${Date.now()}`,
      network,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "squads_create_failed",
        message:
          e instanceof Error
            ? e.message
            : "failed to create Squads smart account",
      },
      // 500 (not 502) so browsers don't mistake this for an nginx /
      // proxy-layer failure. The real failure is that Solana RPC /
      // Squads v4 couldn't land the tx — surface it as a clean 5xx
      // from the app, and the client wizard already reads { message }.
      { status: 500 },
    );
  }

  // ─── 3. Delegate spending limit to the agent's Solana pubkey ───
  // Also awaits confirmation. If this throws, we have NOT yet persisted
  // a vault row — so a failed setSpendingLimit leaves no orphan in SQLite.
  let spendingLimit;
  try {
    spendingLimit = await setSpendingLimit({
      smartAccountAddress: smartAccount.address,
      agentKeyPubkey: agentSolana.pubkey,
      dailyLimitUsd,
      weeklyLimitUsd,
      perTxMaxUsd,
      network,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "squads_spending_limit_failed",
        message:
          e instanceof Error
            ? e.message
            : "smart account created but spending limit failed",
        // Surface the multisig address so a human can inspect on Explorer
        // and decide whether to retry or to manually add the limit.
        smartAccountAddress: smartAccount.address,
        explorerUrl: explorerAddressUrl(smartAccount.address, network),
      },
      // 500 (not 502) so browsers don't mistake this for an nginx /
      // proxy-layer failure. The real failure is that Solana RPC /
      // Squads v4 couldn't land the tx — surface it as a clean 5xx
      // from the app, and the client wizard already reads { message }.
      { status: 500 },
    );
  }

  // ─── 3.5. Ensure the vault's USDC ATA exists so the first /pay call
  //         won't die with "program expected account to be initialized".
  //
  // Failure here is NOT fatal — the vault itself is real on-chain, the
  // spending limit is delegated, and the owner can still re-run the
  // funding step later via the on-page "Fund your vault" widget. We
  // surface a warning but don't block the create.
  let vaultAta: Awaited<ReturnType<typeof ensureVaultUsdcAta>> | null = null;
  let ataError: string | null = null;
  try {
    vaultAta = await ensureVaultUsdcAta({
      smartAccountAddress: smartAccount.address,
      network,
    });
  } catch (e) {
    ataError = e instanceof Error ? e.message : "failed to create vault USDC ATA";
    // deliberately not returning — vault is usable, fund widget can retry
    console.warn(
      `[vault/create] ATA prep warning for ${smartAccount.address}: ${ataError}`,
    );
  }

  // ─── 4. Persist the vault row (only now that on-chain state is real) ───
  const vault = createVault({
    ownerWallet,
    name: body.name!.trim(),
    emoji: body.emoji?.trim() || "🧭",
    purpose: body.purpose?.trim() || "research",
    dailyLimitUsd,
    weeklyLimitUsd,
    perTxMaxUsd,
    maxCallsPerWindow,
    velocityWindow,
    allowedMerchants: allowedMerchants
      .filter((m): m is string => typeof m === "string")
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean),
    requireMemo: Boolean(body.requireMemo),
    squadsAddress: smartAccount.address,
    network,
  });

  // ─── 5. Persist the on-chain state we need for the pay path ───
  const persisted = setVaultSquadsState(vault.id, {
    vaultPda: smartAccount.vaultPda,
    createSignature: smartAccount.createSignature,
    spendingLimitPda: spendingLimit.spendingLimitPda,
    spendingLimitCreateKey: spendingLimit.spendingLimitCreateKey,
    setSpendingLimitSignature: spendingLimit.setSignature,
  });

  // ─── 6. Issue the agent key, bound to the Solana delegate keypair ───
  const { record: agentKey, raw: agentKeyRaw } = issueAgentKey(
    vault.id,
    "primary",
    { pubkey: agentSolana.pubkey, secretB58: agentSolana.secretB58 },
  );

  const realMode = isSquadsReal();

  return NextResponse.json(
    {
      vault: persisted ?? vault,
      squads: {
        mode: realMode ? "real" : "stub",
        smartAccountAddress: smartAccount.address,
        vaultPda: smartAccount.vaultPda,
        createSignature: smartAccount.createSignature,
        spendingLimitPda: spendingLimit.spendingLimitPda,
        spendingLimitCreateKey: spendingLimit.spendingLimitCreateKey,
        setSignature: spendingLimit.setSignature,
        // Explorer links — only meaningful in real mode, but we always
        // return them so the UI doesn't have to branch on shape.
        smartAccountExplorerUrl: explorerAddressUrl(
          smartAccount.address,
          network,
        ),
        vaultPdaExplorerUrl: explorerAddressUrl(smartAccount.vaultPda, network),
        spendingLimitExplorerUrl: explorerAddressUrl(
          spendingLimit.spendingLimitPda,
          network,
        ),
      },
      agentKey: {
        id: agentKey.id,
        prefix: agentKey.keyPrefix,
        raw: agentKeyRaw,
        solanaPubkey: agentKey.solanaPubkey,
      },
      // Funding info so the wizard's success screen can display the
      // "Fund your vault" widget immediately without a round-trip.
      funding: vaultAta
        ? {
            vaultPda: vaultAta.vaultPda,
            usdcAta: vaultAta.vaultAta,
            usdcMint: vaultAta.usdcMint,
            ataCreated: vaultAta.created,
            ataSignature: vaultAta.createSignature,
            ataExplorerUrl: vaultAta.createSignature
              ? `https://explorer.solana.com/tx/${vaultAta.createSignature}?cluster=${network}`
              : null,
            ataAccountExplorerUrl: explorerAddressUrl(
              vaultAta.vaultAta,
              network,
            ),
            // One-click faucet with the ATA pre-filled
            faucetUrl: "https://faucet.circle.com/",
            warning: null,
          }
        : {
            vaultPda: null,
            usdcAta: null,
            usdcMint: null,
            ataCreated: false,
            ataSignature: null,
            ataExplorerUrl: null,
            ataAccountExplorerUrl: null,
            faucetUrl: "https://faucet.circle.com/",
            warning: ataError ?? "ATA prep skipped",
          },
    },
    { status: 201 },
  );
}
