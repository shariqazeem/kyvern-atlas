/**
 * Kyvern policy program client.
 *
 * Wraps the on-chain `kyvern_policy` Anchor program at
 * `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`. This is what the
 * `/demo` page hits when a judge clicks "Pay an unknown wallet" or
 * "Skip the memo" — the program rejects on-chain with a custom error
 * code visible in Solana Explorer logs, and we capture the failed
 * signature.
 *
 * Two operations exposed:
 *   1. `initializePolicy()` — one-time setup per vault. Stores per-tx
 *      cap, memo requirement, velocity window, and a SHA-256
 *      allowlist of merchant hostnames in the policy PDA.
 *   2. `callExecutePayment()` — invoke the program's `execute_payment`
 *      instruction. With `expectFailure: true` we submit with
 *      `skipPreflight: true` so the cluster ingests the tx even though
 *      it'll revert on-chain — yielding a real failed signature with
 *      the program's custom error code.
 *
 * The off-chain policy engine in `src/lib/policy-engine.ts` mirrors
 * these rules for fast pre-checks. The program is the source of truth.
 */

import { createHash } from "node:crypto";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "./idl.json";

export const KYVERN_POLICY_PROGRAM_ID = new PublicKey(
  "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc",
);

export const SQUADS_V4_PROGRAM_ID = new PublicKey(
  "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
);

const POLICY_SEED = Buffer.from("kyvern-policy-v1");

/* ──────────────────────────────────────────────────────────────────
   PDA derivation
   ────────────────────────────────────────────────────────────────── */

export function derivePolicyPda(multisig: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_SEED, multisig.toBuffer()],
    KYVERN_POLICY_PROGRAM_ID,
  );
}

/* ──────────────────────────────────────────────────────────────────
   Merchant hash — SHA-256 of normalized hostname.
   Must match the off-chain `normalizeMerchant` in policy-engine.ts.
   ────────────────────────────────────────────────────────────────── */

export function hashMerchantHostname(normalized: string): Buffer {
  return createHash("sha256").update(normalized, "utf8").digest();
}

/* ──────────────────────────────────────────────────────────────────
   Anchor program accessor.
   We construct a fresh Program for each call because the provider's
   wallet is per-call (different signers across init vs execute).
   ────────────────────────────────────────────────────────────────── */

function makeProgram(
  connection: Connection,
  walletSigner: Keypair,
): anchor.Program<anchor.Idl> {
  const wallet = new anchor.Wallet(walletSigner);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return new anchor.Program(idl as unknown as anchor.Idl, provider);
}

/* ──────────────────────────────────────────────────────────────────
   initialize_policy — one-time setup per vault.
   ────────────────────────────────────────────────────────────────── */

export interface InitializePolicyParams {
  connection: Connection;
  /**
   * Authority keypair. This becomes the policy admin (can pause,
   * resume, update allowlist later). For the Atlas reference vault
   * we use the server fee payer; for user vaults the owner wallet
   * would sign client-side.
   */
  authority: Keypair;
  multisig: PublicKey;
  perTxMaxBaseUnits: bigint;
  requireMemo: boolean;
  velocityWindowSeconds: number;
  velocityMaxCalls: number;
  /** Pre-normalized merchant hostnames (e.g. "api.openai.com"). */
  merchantsNormalized: string[];
}

export async function initializePolicy(
  params: InitializePolicyParams,
): Promise<{ signature: string; policyPda: string }> {
  const program = makeProgram(params.connection, params.authority);
  const [policyPda] = derivePolicyPda(params.multisig);

  const allowlistHashes = params.merchantsNormalized.map((m) =>
    Array.from(hashMerchantHostname(m)),
  );

  // The IDL exposes camelCase names because the TS types file already
  // converts them — but the JSON IDL keeps snake_case. Anchor's
  // method builder works off the snake_case JSON IDL with camelCase
  // calls in TS. Pass camelCase here.
  const sig = await (program.methods as unknown as {
    initializePolicy: (args: unknown) => {
      accountsPartial: (a: unknown) => { rpc: () => Promise<string> };
    };
  })
    .initializePolicy({
      perTxMaxBaseUnits: new anchor.BN(params.perTxMaxBaseUnits.toString()),
      requireMemo: params.requireMemo,
      velocityWindowSeconds: params.velocityWindowSeconds,
      velocityMaxCalls: params.velocityMaxCalls,
      merchantAllowlist: allowlistHashes,
    })
    .accountsPartial({
      multisig: params.multisig,
      authority: params.authority.publicKey,
      policy: policyPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature: sig, policyPda: policyPda.toBase58() };
}

/* ──────────────────────────────────────────────────────────────────
   execute_payment — the hot-path call.
   ────────────────────────────────────────────────────────────────── */

export interface CallExecutePaymentParams {
  connection: Connection;
  /** Server fee payer. Pays SOL even when the tx fails. */
  feePayer: Keypair;
  /** Agent delegate. Must be a Squads spending-limit member. */
  member: Keypair;
  multisig: PublicKey;
  spendingLimit: PublicKey;
  mint: PublicKey;
  /** Squads vault PDA — the SOL-funded treasury wrapper. */
  vault: PublicKey;
  /** Vault's USDC ATA. Source of funds. */
  vaultTokenAccount: PublicKey;
  destination: PublicKey;
  destinationTokenAccount: PublicKey;
  amountBaseUnits: bigint;
  decimals: number;
  /** SHA-256 of normalized merchant. */
  merchantHash: Buffer;
  memo: string | null;
  /**
   * If true, submit with `skipPreflight: true` so a tx that will
   * revert still gets a signature and lands on chain. Used by the
   * /demo page to capture real failed signatures.
   */
  expectFailure: boolean;
}

export async function callExecutePayment(
  params: CallExecutePaymentParams,
): Promise<{ signature: string | null; explorerUrl: string | null }> {
  const program = makeProgram(params.connection, params.feePayer);
  const [policyPda] = derivePolicyPda(params.multisig);

  // Build the instruction via the methods builder.
  const ix: TransactionInstruction = await (program.methods as unknown as {
    executePayment: (args: unknown) => {
      accountsPartial: (a: unknown) => { instruction: () => Promise<TransactionInstruction> };
    };
  })
    .executePayment({
      amount: new anchor.BN(params.amountBaseUnits.toString()),
      decimals: params.decimals,
      merchantHash: Array.from(params.merchantHash),
      memo: params.memo,
    })
    .accountsPartial({
      policy: policyPda,
      member: params.member.publicKey,
      multisig: params.multisig,
      spendingLimit: params.spendingLimit,
      mint: params.mint,
      vault: params.vault,
      vaultTokenAccount: params.vaultTokenAccount,
      destination: params.destination,
      destinationTokenAccount: params.destinationTokenAccount,
      squadsProgram: SQUADS_V4_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  tx.feePayer = params.feePayer.publicKey;
  const { blockhash, lastValidBlockHeight } =
    await params.connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  // Both fee payer and member sign.
  tx.partialSign(params.feePayer, params.member);

  try {
    const sig = await params.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: params.expectFailure,
      preflightCommitment: "confirmed",
    });

    if (!params.expectFailure) {
      // Successful path — wait for confirmation.
      await params.connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed",
      );
    }

    return {
      signature: sig,
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    };
  } catch (err) {
    // RPC-level rejection (bad blockhash, signature failure). No tx
    // was ingested → no signature to return. Caller falls back to
    // off-chain block messaging.
    console.error(
      "[callExecutePayment] sendRawTransaction failed:",
      err instanceof Error ? err.message : err,
    );
    return { signature: null, explorerUrl: null };
  }
}

/* ──────────────────────────────────────────────────────────────────
   Probe — does the policy PDA exist for this vault?
   ────────────────────────────────────────────────────────────────── */

export async function isPolicyInitialized(
  connection: Connection,
  multisig: PublicKey,
): Promise<boolean> {
  const [pda] = derivePolicyPda(multisig);
  const acct = await connection.getAccountInfo(pda);
  return acct !== null && acct.owner.equals(KYVERN_POLICY_PROGRAM_ID);
}
