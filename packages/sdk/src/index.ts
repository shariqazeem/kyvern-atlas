/*!
 * @kyvernlabs/sdk — Give your AI agent a Visa with a daily cap on Solana.
 * Enforced on-chain by Squads v4. One import. No runtime, no proxy.
 *
 *   import { Vault } from "@kyvernlabs/sdk";
 *
 *   const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });
 *
 *   const res = await vault.pay({
 *     merchant: "api.openai.com",
 *     recipientPubkey: "5eykt4...",
 *     amount: 0.12,
 *     memo: "forecast lookup",
 *   });
 *
 *   if (res.decision === "blocked") console.log("refused:", res.reason);
 */

export const SDK_VERSION = "0.4.0";

/* ─── Public types (matching /api/vault/* contracts) ─── */

export type VelocityWindow = "1h" | "1d" | "1w";

export type PolicyBlockCode =
  | "vault_paused"
  | "invalid_amount"
  | "amount_exceeds_per_tx"
  | "amount_exceeds_daily"
  | "amount_exceeds_weekly"
  | "merchant_not_allowed"
  | "invalid_merchant"
  | "velocity_cap"
  | "missing_memo";

export interface VaultSummary {
  id: string;
  name: string;
  network?: "devnet" | "mainnet";
  pausedAt?: string | null;
}

export interface PaymentRecord {
  id: string;
  vaultId: string;
  merchant: string;
  amountUsd: number;
  memo: string | null;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface BudgetSnapshot {
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;
  spentToday: number;
  spentThisWeek: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  dailyUtilization: number;
  weeklyUtilization: number;
}

export interface VelocitySnapshot {
  callsInWindow: number;
  maxCallsPerWindow: number;
  velocityWindow: VelocityWindow;
  windowStart: string;
}

export interface VaultStatus {
  vault: VaultSummary & Record<string, unknown>;
  budget: BudgetSnapshot;
  velocity: VelocitySnapshot;
  payments: PaymentRecord[];
}

export interface PayInput {
  merchant: string;
  recipientPubkey: string;
  amount: number;
  memo?: string;
}

export interface PayAllowed {
  decision: "allowed";
  payment: PaymentRecord;
  tx: { signature: string; explorerUrl: string };
  budget: Partial<BudgetSnapshot>;
  velocity: Partial<VelocitySnapshot>;
  vault: VaultSummary;
}

export interface PayBlocked {
  decision: "blocked";
  code: PolicyBlockCode;
  reason: string;
  payment: PaymentRecord;
  vault: VaultSummary;
}

export type PayResult = PayAllowed | PayBlocked;

/* ─── Errors ─── */

export class KyvernError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;
  constructor(message: string, status: number, code: string, body: unknown) {
    super(message);
    this.name = "KyvernError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export class KyvernAuthError extends KyvernError {
  constructor(body: unknown) {
    super("agent key is missing, invalid, or revoked", 401, "unauthorized", body);
    this.name = "KyvernAuthError";
  }
}

export class KyvernPaymentBlocked extends KyvernError {
  readonly policyCode: PolicyBlockCode;
  readonly policyReason: string;
  readonly result: PayBlocked;
  constructor(result: PayBlocked) {
    super(
      `payment blocked: ${result.reason}`,
      402,
      result.code,
      result,
    );
    this.name = "KyvernPaymentBlocked";
    this.policyCode = result.code;
    this.policyReason = result.reason;
    this.result = result;
  }
}

/* ─── Config ─── */

export interface VaultOptions {
  /** Agent key from the Kyvern dashboard (`kv_live_…`). */
  agentKey: string;
  /** Override the API host. Defaults to https://kyvernlabs.com. */
  baseUrl?: string;
  /** Custom fetch (Node < 18, test doubles, Cloudflare Workers, etc.). */
  fetch?: typeof fetch;
  /** Timeout in ms. Defaults to 15s. */
  timeoutMs?: number;
  /** Owner wallet — only needed for `pause`/`resume`. */
  ownerWallet?: string;
  /** When true, `pay()` throws `KyvernPaymentBlocked` on policy blocks
   *  instead of returning the blocked result. Defaults to false. */
  throwOnBlocked?: boolean;
}

/* ─── The Vault class ─── */

export class Vault {
  private readonly agentKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly ownerWallet?: string;
  private readonly throwOnBlocked: boolean;

  constructor(options: VaultOptions) {
    if (!options?.agentKey) {
      throw new Error(
        "@kyvernlabs/sdk: `agentKey` is required. " +
          "Mint one at https://kyvernlabs.com/vault/new",
      );
    }
    this.agentKey = options.agentKey;
    this.baseUrl = (options.baseUrl ?? "https://kyvernlabs.com").replace(
      /\/+$/,
      "",
    );
    this.fetchFn = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.ownerWallet = options.ownerWallet;
    this.throwOnBlocked = !!options.throwOnBlocked;
  }

  /** Ask the vault to pay a merchant. Policy is enforced server-side. */
  async pay(input: PayInput): Promise<PayResult> {
    if (!input?.merchant) throw new Error("pay(): `merchant` is required");
    if (!input?.recipientPubkey)
      throw new Error("pay(): `recipientPubkey` is required");
    if (!(typeof input.amount === "number") || input.amount <= 0)
      throw new Error("pay(): `amount` must be a positive number");

    const res = await this.request("/api/vault/pay", {
      method: "POST",
      body: {
        merchant: input.merchant,
        recipientPubkey: input.recipientPubkey,
        amountUsd: input.amount,
        memo: input.memo ?? null,
      },
    });

    // 402 = policy block (x402 nod). 200 = settled.
    if (res.status === 402) {
      const body = (await res.json()) as PayBlocked;
      if (this.throwOnBlocked) throw new KyvernPaymentBlocked(body);
      return body;
    }
    if (res.status === 401) {
      throw new KyvernAuthError(await this.tryJson(res));
    }
    if (!res.ok) {
      throw new KyvernError(
        `pay() failed: HTTP ${res.status}`,
        res.status,
        "http_error",
        await this.tryJson(res),
      );
    }
    return (await res.json()) as PayAllowed;
  }

  /** Fetch the current vault status (budget + velocity + recent payments). */
  async status(opts: { vaultId: string; limit?: number }): Promise<VaultStatus> {
    if (!opts?.vaultId) throw new Error("status(): `vaultId` is required");
    const qs = opts.limit ? `?limit=${opts.limit}` : "";
    const res = await this.request(
      `/api/vault/${encodeURIComponent(opts.vaultId)}${qs}`,
      { method: "GET" },
    );
    if (!res.ok) {
      throw new KyvernError(
        `status() failed: HTTP ${res.status}`,
        res.status,
        "http_error",
        await this.tryJson(res),
      );
    }
    return (await res.json()) as VaultStatus;
  }

  /** Pause the vault — agent payments are blocked instantly. */
  async pause(opts: { vaultId: string }): Promise<{ ok: true }> {
    return this.toggle(opts.vaultId, "POST");
  }

  /** Resume a paused vault. */
  async resume(opts: { vaultId: string }): Promise<{ ok: true }> {
    return this.toggle(opts.vaultId, "DELETE");
  }

  private async toggle(
    vaultId: string,
    method: "POST" | "DELETE",
  ): Promise<{ ok: true }> {
    if (!this.ownerWallet) {
      throw new Error(
        "pause/resume requires `ownerWallet` in the Vault constructor options",
      );
    }
    const res = await this.request(
      `/api/vault/${encodeURIComponent(vaultId)}/pause`,
      {
        method,
        body: { ownerWallet: this.ownerWallet },
        extraHeaders: { "x-owner-wallet": this.ownerWallet },
      },
    );
    if (!res.ok) {
      throw new KyvernError(
        `${method === "POST" ? "pause" : "resume"}() failed: HTTP ${res.status}`,
        res.status,
        "http_error",
        await this.tryJson(res),
      );
    }
    return { ok: true };
  }

  /* ─── internals ─── */

  private async request(
    path: string,
    init: {
      method: string;
      body?: unknown;
      extraHeaders?: Record<string, string>;
    },
  ): Promise<Response> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.agentKey}`,
        "User-Agent": `@kyvernlabs/sdk/${SDK_VERSION}`,
        ...(init.extraHeaders ?? {}),
      };
      if (init.body !== undefined)
        headers["Content-Type"] = "application/json";

      return await this.fetchFn(this.baseUrl + path, {
        method: init.method,
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async tryJson(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
}

/* ─── Convenience re-exports for typing ─── */

export default Vault;

/* ─── On-chain path (the real deal) ───
 * OnChainVault talks directly to the deployed kyvern_policy Anchor
 * program on Solana. Every pay() produces a real on-chain signature —
 * allowed or blocked. Blocked calls are failed transactions visible on
 * Explorer, not HTTP 402s.
 *
 * Requires the Solana peer deps (@solana/web3.js, @coral-xyz/anchor,
 * @solana/spl-token, @sqds/multisig). HTTP-only users of the `Vault`
 * class never import this path. */
export {
  OnChainVault,
  OnChainPaymentBlocked,
  buildExecutePaymentIx,
  derivePolicyPda,
  explorerUrl,
  KYVERN_PROGRAM_ID_DEVNET,
  KYVERN_PROGRAM_ID_MAINNET,
  SQUADS_V4_PROGRAM_ID,
  USDC_MINT_DEVNET,
  USDC_MINT_MAINNET,
} from "./onchain";
export type {
  OnChainCluster,
  OnChainVaultOptions,
  OnChainPayOptions,
  OnChainAllowed,
  OnChainBlocked,
  OnChainResult,
} from "./onchain";
