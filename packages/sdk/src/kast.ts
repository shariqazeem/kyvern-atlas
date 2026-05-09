/**
 * KastDestination — declares-intent helper for paying out to a
 * KAST-funded card via the user's Solana USDC deposit address.
 *
 * KAST exposes a public Solana USDC deposit address per user
 * (visible in the KAST app under Deposit → Solana USDC). USDC sent
 * to that address tops up the user's KAST card; the user spends at
 * 150M+ merchants worldwide.
 *
 * Wrap your agent's payouts in `KastDestination.fromAddress(...)`
 * to keep the merchant tag consistent (`kast.xyz`) so the on-chain
 * Kyvern policy + Squads spending limit see one stable label across
 * all KAST-targeted spends. Same SDK, same .pay() call shape:
 *
 * ```ts
 * import { Vault, KastDestination } from "@kyvernlabs/sdk";
 *
 * const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });
 * const myKast = KastDestination.fromAddress(process.env.MY_KAST_ADDRESS!);
 *
 * const res = await vault.pay({
 *   ...myKast,
 *   amount: 1.5,
 *   memo: "weekly yield share",
 * });
 * ```
 *
 * Honesty: KAST has no public B2B API to verify the address. Anyone
 * can paste any Solana address — we don't enforce that it's owned
 * by a KAST account. The user owns the address either way.
 *
 * Kyvern is *compatible with KAST deposit rails*. Not affiliated
 * with KAST.
 */

const SOLANA_BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isLikelySolanaAddress(s: string): boolean {
  return typeof s === "string" && SOLANA_BASE58.test(s.trim());
}

export class KastDestination {
  /**
   * Build a `vault.pay()` destination from a KAST Solana USDC
   * deposit address. Returns `{ merchant, recipientPubkey }` —
   * spread it into the `vault.pay()` call alongside `amount`/`memo`.
   *
   * Throws if the address isn't a syntactically valid Solana pubkey.
   * (We don't fetch chain state here — invalid pubkeys would simply
   * fail at submission time, but throwing early is friendlier.)
   */
  static fromAddress(address: string): {
    merchant: "kast.xyz";
    recipientPubkey: string;
  } {
    const trimmed = (address ?? "").trim();
    if (!trimmed) {
      throw new Error("KastDestination: address is required");
    }
    if (!isLikelySolanaAddress(trimmed)) {
      throw new Error(
        "KastDestination: address must be a base58 Solana public key (32–44 chars). Find yours in the KAST app under Deposit → Solana USDC.",
      );
    }
    return {
      merchant: "kast.xyz",
      recipientPubkey: trimmed,
    };
  }
}
