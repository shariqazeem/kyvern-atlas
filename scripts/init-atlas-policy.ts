/**
 * One-shot: initialize the Kyvern policy PDA for Atlas's vault.
 *
 * Atlas's Squads multisig is `7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP`.
 * The Kyvern policy PDA derived from it is
 * `6MBRjDdyUmDVTFUj8Dmi9agDLQ6TfgnEQRs5GMSH2yvu` (seeds:
 * ["kyvern-policy-v1", multisig]).
 *
 * Today this PDA is uninitialized — `/api/vault/pay` and the Atlas
 * runner route through Squads `spendingLimitUse` directly, never
 * touching our Anchor program. SPEC_TO_WIN §7.5 calls this gap THE
 * highest-leverage technical change: every violation should produce
 * a real failed Solana tx that includes the Kyvern program in its
 * instruction trace. To get there we need the policy PDA initialized
 * with the same params as the Squads spending limit, so the on-chain
 * rules match the off-chain pre-check.
 *
 * Usage on the VM (after deploying this commit):
 *   cd ~/kyvernlabs-commerce && npx tsx scripts/init-atlas-policy.ts
 *
 * Idempotent: if the PDA already exists, prints its address and
 * exits. Safe to re-run.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { loadServerSigner } from "../src/lib/solana-keystore";
import {
  initializePolicy,
  isPolicyInitialized,
  derivePolicyPda,
} from "../src/lib/kyvern-policy/client";

const ATLAS_MULTISIG = new PublicKey(
  "7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP",
);

// Atlas's allowed merchants (from the vaults table). Each gets SHA-256'd
// in initializePolicy() so the on-chain check is hash-based.
const ATLAS_ALLOWED_MERCHANTS = [
  "api.openai.com",
  "api.anthropic.com",
  "api.perplexity.ai",
  "api.brave.com",
  "api.arweave.net",
  "kyvern-devices",
  "kyvern.payout",
  "kyvern.escrow",
  "kyvern.stake",
  "kyvern.fund",
  "api.pay.sh",
];

// Match Atlas's existing policy:
//   per_tx_max_usd: 2 → 2_000_000 base units (USDC has 6 decimals)
//   require_memo: true
//   velocity_window: "1h" → 3600 seconds
//   max_calls_per_window: 60
const ATLAS_PER_TX_BASE_UNITS = 2_000_000n;
const ATLAS_REQUIRE_MEMO = true;
const ATLAS_VELOCITY_WINDOW_SECONDS = 3600;
const ATLAS_VELOCITY_MAX_CALLS = 60;

async function main() {
  const signer = await loadServerSigner({ network: "devnet" });
  const connection: Connection = signer.connection;

  console.log("Server signer:", signer.keypair.publicKey.toBase58());
  console.log("Atlas multisig:", ATLAS_MULTISIG.toBase58());

  const [policyPda] = derivePolicyPda(ATLAS_MULTISIG);
  console.log("Policy PDA:", policyPda.toBase58());

  if (await isPolicyInitialized(connection, ATLAS_MULTISIG)) {
    console.log("Already initialized — nothing to do.");
    return;
  }

  console.log("Initializing policy with:");
  console.log("  per_tx_max:", ATLAS_PER_TX_BASE_UNITS, "(base units)");
  console.log("  require_memo:", ATLAS_REQUIRE_MEMO);
  console.log(
    "  velocity:",
    ATLAS_VELOCITY_MAX_CALLS,
    "calls /",
    ATLAS_VELOCITY_WINDOW_SECONDS,
    "s",
  );
  console.log("  allowlist:", ATLAS_ALLOWED_MERCHANTS.length, "entries");

  const result = await initializePolicy({
    connection,
    authority: signer.keypair,
    multisig: ATLAS_MULTISIG,
    perTxMaxBaseUnits: ATLAS_PER_TX_BASE_UNITS,
    requireMemo: ATLAS_REQUIRE_MEMO,
    velocityWindowSeconds: ATLAS_VELOCITY_WINDOW_SECONDS,
    velocityMaxCalls: ATLAS_VELOCITY_MAX_CALLS,
    merchantsNormalized: ATLAS_ALLOWED_MERCHANTS,
  });

  console.log("Initialized!");
  console.log("  signature:", result.signature);
  console.log(
    "  explorer:",
    `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
  );
  console.log("  policyPda:", result.policyPda);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
