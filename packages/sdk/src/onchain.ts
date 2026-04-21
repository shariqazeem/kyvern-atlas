/**
 * ════════════════════════════════════════════════════════════════════
 * OnChainVault — the canonical SDK surface for the deployed program.
 *
 * Unlike the HTTP `Vault` class (which talks to kyvernlabs.com/api),
 * this class submits `execute_payment` transactions directly to the
 * kyvern_policy Anchor program on Solana devnet/mainnet. Every pay()
 * call produces a real Solana signature — allowed or blocked — and
 * the blocked case renders as a failed-tx on Explorer with the exact
 * program error code in the logs.
 *
 * This is the class judges see when they clone the repo and paste our
 * copy-paste snippet into a terminal. It is the "one import" from the
 * landing page.
 *
 * Usage:
 *
 *   import { OnChainVault } from "@kyvernlabs/sdk";
 *   import { Keypair, Connection, PublicKey } from "@solana/web3.js";
 *
 *   const vault = new OnChainVault({
 *     cluster: "devnet",
 *     connection: new Connection("https://api.devnet.solana.com"),
 *     multisig: new PublicKey("…"),
 *     spendingLimit: new PublicKey("…"),
 *   });
 *
 *   const res = await vault.pay({
 *     agent: Keypair.fromSecretKey(…),
 *     recipient: new PublicKey("…"),
 *     amount: 0.50,
 *     merchant: "api.openai.com",
 *     memo: "forecast lookup",
 *   });
 *
 *   if (res.decision === "allowed") {
 *     console.log("paid:", res.explorerUrl);
 *   } else {
 *     console.log("blocked by", res.code, "→", res.explorerUrl);
 *   }
 * ════════════════════════════════════════════════════════════════════
 */

import type { Connection, PublicKey, Signer } from "@solana/web3.js";

export type OnChainCluster = "devnet" | "mainnet";

export interface OnChainVaultOptions {
  /** Solana cluster. Determines default program ID and USDC mint. */
  cluster: OnChainCluster;
  /** Solana RPC connection. Bring your own (Helius, QuickNode, public). */
  connection: Connection;
  /** Squads v4 multisig PDA for this vault. */
  multisig: PublicKey;
  /** Squads spending-limit PDA delegated to the agent. */
  spendingLimit: PublicKey;
  /** Override the program ID (for custom deploys). */
  programId?: PublicKey;
  /** Override the mint (default: canonical USDC for the cluster). */
  mint?: PublicKey;
  /** Confirmation commitment. Defaults to "confirmed". */
  commitment?: "processed" | "confirmed" | "finalized";
  /** When true, pay() throws on blocked instead of returning. */
  throwOnBlocked?: boolean;
}

export interface OnChainPayOptions {
  agent: Signer;
  recipient: PublicKey;
  /** USDC in human units (0.50 = $0.50). */
  amount: number;
  merchant: string;
  memo?: string | null;
}

export interface OnChainAllowed {
  decision: "allowed";
  signature: string;
  explorerUrl: string;
}

export interface OnChainBlocked {
  decision: "blocked";
  signature: string;
  explorerUrl: string;
  code: string | null;
  log: string | null;
}

export type OnChainResult = OnChainAllowed | OnChainBlocked;

/**
 * The class.
 */
export class OnChainVault {
  private readonly cluster: OnChainCluster;
  private readonly connection: Connection;
  private readonly multisig: PublicKey;
  private readonly spendingLimit: PublicKey;
  private readonly programId: PublicKey | null;
  private readonly mint: PublicKey | null;
  private readonly commitment: "processed" | "confirmed" | "finalized";
  private readonly throwOnBlocked: boolean;

  constructor(opts: OnChainVaultOptions) {
    if (!opts?.connection)
      throw new Error("OnChainVault: `connection` is required");
    if (!opts?.multisig)
      throw new Error("OnChainVault: `multisig` is required");
    if (!opts?.spendingLimit)
      throw new Error("OnChainVault: `spendingLimit` is required");
    this.cluster = opts.cluster;
    this.connection = opts.connection;
    this.multisig = opts.multisig;
    this.spendingLimit = opts.spendingLimit;
    this.programId = opts.programId ?? null;
    this.mint = opts.mint ?? null;
    this.commitment = opts.commitment ?? "confirmed";
    this.throwOnBlocked = !!opts.throwOnBlocked;
  }

  /**
   * Submit a payment through the on-chain Kyvern policy program.
   *
   * On allowed → resolves to `{ decision: "allowed", signature, explorerUrl }`.
   * On blocked → resolves to `{ decision: "blocked", signature, explorerUrl, code, log }`,
   *   or throws `OnChainPaymentBlocked` if `throwOnBlocked: true`.
   */
  async pay(opts: OnChainPayOptions): Promise<OnChainResult> {
    if (!opts?.agent) throw new Error("pay(): `agent` is required");
    if (!opts?.recipient) throw new Error("pay(): `recipient` is required");
    if (!opts?.merchant) throw new Error("pay(): `merchant` is required");
    if (typeof opts.amount !== "number" || opts.amount <= 0)
      throw new Error("pay(): `amount` must be a positive number");

    const { PublicKey } = await import("@solana/web3.js");
    const {
      executePaymentOnChain,
      defaultProgramId,
      defaultUsdcMint,
    } = await import("./program/client");

    const result = await executePaymentOnChain(
      {
        cluster: this.cluster,
        connection: this.connection,
        programId:
          this.programId ?? new PublicKey(defaultProgramId(this.cluster)),
        multisig: this.multisig,
        spendingLimit: this.spendingLimit,
        mint: this.mint ?? new PublicKey(defaultUsdcMint(this.cluster)),
        commitment: this.commitment,
      },
      {
        agent: opts.agent,
        recipient: opts.recipient,
        amount: opts.amount,
        merchant: opts.merchant,
        memo: opts.memo ?? null,
      },
    );

    if (result.decision === "blocked" && this.throwOnBlocked) {
      throw new OnChainPaymentBlocked(result);
    }
    return result;
  }
}

/** Thrown when `throwOnBlocked: true` is set and a pay() is rejected. */
export class OnChainPaymentBlocked extends Error {
  readonly signature: string;
  readonly explorerUrl: string;
  readonly code: string | null;
  readonly log: string | null;
  constructor(result: OnChainBlocked) {
    super(
      `payment blocked on-chain${result.code ? `: ${result.code}` : ""}`,
    );
    this.name = "OnChainPaymentBlocked";
    this.signature = result.signature;
    this.explorerUrl = result.explorerUrl;
    this.code = result.code;
    this.log = result.log;
  }
}

// Re-export the lower-level helpers so power users can compose txs
// themselves (e.g. bundle execute_payment with a downstream call atomically).
export {
  buildExecutePaymentIx,
  derivePolicyPda,
  explorerUrl,
  KYVERN_PROGRAM_ID_DEVNET,
  KYVERN_PROGRAM_ID_MAINNET,
  SQUADS_V4_PROGRAM_ID,
  USDC_MINT_DEVNET,
  USDC_MINT_MAINNET,
} from "./program/client";
