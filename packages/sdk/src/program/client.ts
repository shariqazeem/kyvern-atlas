/**
 * ════════════════════════════════════════════════════════════════════
 * On-chain client — the real thing.
 *
 * Directly submits `execute_payment` transactions to the deployed
 * kyvern_policy program. No middleware, no HTTP 402 pretending to be
 * enforcement. If the rule fails OR the Squads CPI fails, the whole
 * Solana transaction reverts and the caller sees a real failed tx sig
 * they can click on Explorer.
 *
 * This module is dependency-heavy (@coral-xyz/anchor, @solana/web3.js,
 * @solana/spl-token). The main SDK index keeps it behind a lazy import
 * so HTTP-only consumers pay no cost.
 * ════════════════════════════════════════════════════════════════════
 */

import type {
  Connection,
  PublicKey as PublicKeyType,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import type { Idl } from "@coral-xyz/anchor";

// Program defaults
export const KYVERN_PROGRAM_ID_DEVNET =
  "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";
// When we deploy to mainnet we'll pin a separate ID here.
export const KYVERN_PROGRAM_ID_MAINNET = KYVERN_PROGRAM_ID_DEVNET;

export const SQUADS_V4_PROGRAM_ID =
  "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf";

export const USDC_MINT_DEVNET =
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_MINT_MAINNET =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const SPL_TOKEN_PROGRAM_ID =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export type KyvernCluster = "devnet" | "mainnet";

export function defaultProgramId(cluster: KyvernCluster): string {
  return cluster === "mainnet"
    ? KYVERN_PROGRAM_ID_MAINNET
    : KYVERN_PROGRAM_ID_DEVNET;
}

export function defaultUsdcMint(cluster: KyvernCluster): string {
  return cluster === "mainnet" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
}

export function explorerUrl(
  kind: "tx" | "address",
  value: string,
  cluster: KyvernCluster,
): string {
  const base = `https://explorer.solana.com/${kind}/${value}`;
  return cluster === "devnet" ? `${base}?cluster=devnet` : base;
}

/* ─── Options for the on-chain path ─── */

export interface OnChainPayInput {
  /** Agent delegate — the Squads spending-limit member. Signs the ix. */
  agent: Signer;
  /** USDC amount in human units ($0.50 → 0.5). */
  amount: number;
  /** Recipient wallet pubkey (we resolve their USDC ATA). */
  recipient: PublicKeyType;
  /** Merchant hostname (normalized to lowercase before hashing). */
  merchant: string;
  /** Optional memo; required if policy.require_memo. */
  memo?: string | null;
}

export interface OnChainPayContext {
  cluster: KyvernCluster;
  connection: Connection;
  programId: PublicKeyType;
  /** Squads multisig that this vault wraps. */
  multisig: PublicKeyType;
  /** The Squads spending-limit PDA delegated to the agent. */
  spendingLimit: PublicKeyType;
  /** Mint of the token being moved (USDC on devnet/mainnet). */
  mint: PublicKeyType;
  /** Commitment to use for tx confirmation. */
  commitment?: "processed" | "confirmed" | "finalized";
}

export interface OnChainPayAllowed {
  decision: "allowed";
  signature: string;
  explorerUrl: string;
}

export interface OnChainPayBlocked {
  decision: "blocked";
  signature: string;
  explorerUrl: string;
  /** Program-log-derived error code (e.g. "MerchantNotAllowlisted"). */
  code: string | null;
  /** Full program log line if extractable. */
  log: string | null;
}

export type OnChainPayResult = OnChainPayAllowed | OnChainPayBlocked;

/* ─── Utilities ─── */

function normalizeMerchant(input: string): string {
  try {
    // Full URL — take hostname
    const u = new URL(input);
    return u.hostname.toLowerCase();
  } catch {
    return input.trim().toLowerCase();
  }
}

async function merchantHashBytes(merchant: string): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(normalizeMerchant(merchant));
  // Prefer native crypto — works in Node 18+, browsers, workers.
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as any).crypto?.subtle
  ) {
    const digest = await (globalThis as any).crypto.subtle.digest(
      "SHA-256",
      enc,
    );
    return new Uint8Array(digest);
  }
  // Node < 18 fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require("crypto") as typeof import("crypto");
  return new Uint8Array(createHash("sha256").update(enc).digest());
}

/**
 * Derive the per-vault Kyvern policy PDA.
 *
 * Seeds: [b"kyvern-policy-v1", multisig.key()]
 */
export async function derivePolicyPda(
  programId: PublicKeyType,
  multisig: PublicKeyType,
): Promise<PublicKeyType> {
  const { PublicKey } = await import("@solana/web3.js");
  const [pda] = PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("kyvern-policy-v1"),
      multisig.toBuffer(),
    ],
    programId,
  );
  return pda as unknown as PublicKeyType;
}

/**
 * Build the execute_payment instruction without submitting. Useful when
 * the caller wants to bundle it with other ixs (e.g. a wrap/unwrap step).
 */
export async function buildExecutePaymentIx(
  ctx: OnChainPayContext,
  input: OnChainPayInput,
): Promise<TransactionInstruction> {
  const [{ PublicKey, SystemProgram }, { AnchorProvider, BN, Program }, splToken] =
    await Promise.all([
      import("@solana/web3.js"),
      import("@coral-xyz/anchor"),
      import("@solana/spl-token"),
    ]);

  // Derive vault + ATAs
  // Import Squads SDK lazily (we only need its PDA helpers, not rpc.*).
  const multisig = await import("@sqds/multisig");
  const [vaultPda] = multisig.getVaultPda({
    multisigPda: ctx.multisig as any,
    index: 0,
  });
  const vaultAta = splToken.getAssociatedTokenAddressSync(
    ctx.mint as any,
    vaultPda,
    true, // allowOwnerOffCurve — vault PDA is off-curve
  );
  const destAta = splToken.getAssociatedTokenAddressSync(
    ctx.mint as any,
    input.recipient as any,
  );

  const policyPda = await derivePolicyPda(ctx.programId, ctx.multisig);

  // Provider wrapper so Anchor's Program can build the ix. We never call
  // .rpc()/.signAndSend() — we just need .methods.*.instruction().
  const provider = new AnchorProvider(
    ctx.connection,
    // Minimal wallet adapter — Anchor needs `publicKey` for tx building.
    {
      publicKey: input.agent.publicKey,
      signTransaction: async (t: any) => t,
      signAllTransactions: async (ts: any[]) => ts,
    } as any,
    { commitment: ctx.commitment ?? "confirmed" },
  );

  // Load the IDL (resolveJsonModule + default import)
  const idlModule = await import("./idl.json");
  const idl = (idlModule.default ?? idlModule) as unknown as Idl;

  const program = new Program(idl, provider as any);

  const amountBaseUnits = new BN(Math.round(input.amount * 1_000_000));
  const merchantHashU8 = await merchantHashBytes(input.merchant);

  const ix = await program.methods
    .executePayment({
      amount: amountBaseUnits,
      decimals: 6,
      merchantHash: Array.from(merchantHashU8),
      memo: input.memo ?? null,
    })
    .accountsStrict({
      policy: policyPda,
      member: input.agent.publicKey,
      multisig: ctx.multisig,
      spendingLimit: ctx.spendingLimit,
      mint: ctx.mint,
      vault: vaultPda,
      vaultTokenAccount: vaultAta,
      destination: input.recipient,
      destinationTokenAccount: destAta,
      squadsProgram: new PublicKey(SQUADS_V4_PROGRAM_ID),
      tokenProgram: new PublicKey(SPL_TOKEN_PROGRAM_ID),
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix as unknown as TransactionInstruction;
}

/**
 * Build, sign, and submit an execute_payment transaction. Returns a
 * typed result — `allowed` with the settled signature, or `blocked`
 * with the on-chain signature + extracted error code + log line.
 *
 * Both cases produce real Solana signatures you can paste into Explorer.
 * The "blocked" case is a *failed* transaction — judges can click it
 * and see our program's error code in the logs. That's the moat.
 */
export async function executePaymentOnChain(
  ctx: OnChainPayContext,
  input: OnChainPayInput,
): Promise<OnChainPayResult> {
  const [{ Transaction }] = await Promise.all([
    import("@solana/web3.js"),
  ]);

  const ix = await buildExecutePaymentIx(ctx, input);

  const latest = await ctx.connection.getLatestBlockhash(
    ctx.commitment ?? "confirmed",
  );

  const tx = new Transaction({
    feePayer: input.agent.publicKey,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  }).add(ix);
  tx.sign(input.agent);

  // Submit. Two failure modes to handle:
  //   1. sendRawTransaction throws SendTransactionError — some web3.js
  //      versions do this on preflight-caught errors, but the tx may
  //      still be broadcasting or landable via skipPreflight retry.
  //      We catch + retry with skipPreflight so we always get a sig to
  //      attach to a blocked-result.
  //   2. confirmTransaction returns {value:{err}} — the tx landed but
  //      failed on-chain. That's the happy "blocked" path.
  let signature: string;
  try {
    signature = await ctx.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: ctx.commitment ?? "confirmed",
    });
  } catch (e: any) {
    // Preflight caught it — retry with skipPreflight so the blocked tx
    // actually lands on-chain and we get a real signature for Explorer.
    // The original error object carries logs that we parse below.
    const logs: string[] | undefined = e?.logs;
    try {
      signature = await ctx.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
        preflightCommitment: ctx.commitment ?? "confirmed",
      });
    } catch (e2: any) {
      // Second send failed too — give the caller the logs we have. This
      // path is rare (blockhash expired, network down). No tx on-chain.
      return {
        decision: "blocked",
        signature: "",
        explorerUrl: "",
        code: extractErrorCode(logs ?? e2?.logs ?? []),
        log:
          (logs ?? e2?.logs ?? []).find((l: string) =>
            l.includes("Error Code:"),
          ) ?? null,
      };
    }
  }

  // Wait for landing. On-chain err → blocked; null err → allowed.
  const conf = await ctx.connection.confirmTransaction(
    {
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    ctx.commitment ?? "confirmed",
  );

  const url = explorerUrl("tx", signature, ctx.cluster);

  if (conf.value.err == null) {
    return { decision: "allowed", signature, explorerUrl: url };
  }

  // Pull error code from program logs.
  const detail = await ctx.connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const logs = detail?.meta?.logMessages ?? [];
  const errLine = logs.find((l) => l.includes("Error Code:"));
  const code = extractErrorCode(logs);

  return {
    decision: "blocked",
    signature,
    explorerUrl: url,
    code,
    log: errLine ?? null,
  };
}

function extractErrorCode(logs: string[]): string | null {
  const line = logs.find((l) => l.includes("Error Code:"));
  if (!line) return null;
  const m = line.match(/Error Code: (\w+)/);
  return m?.[1] ?? null;
}
