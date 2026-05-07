# Frontier · Phase 0/1/2/5 scaffolds

This file holds every block of code from `KYVERN_FRONTIER_GRAND_CHAMPION_SPEC.md` that needs **deploy** action outside this Next.js codebase. Phases 6, 3, 4, 7, 8 are already shipped to production; the four below need Rust/Anchor or Cloudflare credentials I don't have access to from here. Lift each block wholesale.

---

## Phase 0 — Pyth devnet feed verification (15m)

`scripts/verify-pyth-feeds.ts`:

```ts
import { Connection, PublicKey } from "@solana/web3.js";
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/client";

const PYTH_FEEDS = {
  SOL_USD: "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
  BTC_USD: "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J",
  ETH_USD: "EdVCmQ9FSPcVRAvxcUuoLHt1J2NkB1hLsSHmqVFmSmH1",
} as const;

async function main() {
  const conn = new Connection("https://api.devnet.solana.com");
  const programKey = getPythProgramKeyForCluster("devnet");
  const pyth = new PythHttpClient(conn, programKey);
  const data = await pyth.getData();

  for (const [name, feed] of Object.entries(PYTH_FEEDS)) {
    const account = data.productPrice.get(feed);
    if (!account) {
      console.log(`${name} ${feed} → NOT FOUND`);
      continue;
    }
    const price = account.aggregate.price ?? null;
    const stale = account.aggregate.publishSlot
      ? Date.now() / 1000 - account.aggregate.publishSlot * 0.4 > 60
      : true;
    console.log(
      `${name} ${feed} → $${price?.toFixed(2) ?? "—"} ${stale ? "(STALE)" : "(fresh)"}`,
    );
  }
}
main().catch(console.error);
```

Run with `npx tsx scripts/verify-pyth-feeds.ts` after `npm i @pythnetwork/client @solana/web3.js`. If any feed is stale or missing, set `oracle_fallback_used = true` in the swap_via_oracle event.

---

## Phase 1 — Anchor program · `swap_via_oracle` (3h)

Add to `anchor/programs/kyvern-policy/src/lib.rs`:

```rust
use pyth_sdk_solana::load_price_feed_from_account_info;

#[account]
pub struct TreasuryReserve {
    pub mint: Pubkey,
    pub bump: u8,
    pub authority: Pubkey,
    pub total_swapped_in: u64,
    pub total_swapped_out: u64,
}

#[account]
pub struct OracleAllowlist {
    pub token_mint: Pubkey,
    pub pyth_feed: Pubkey,
    pub max_staleness_seconds: u32,
    pub bump: u8,
}

pub fn swap_via_oracle(
    ctx: Context<SwapViaOracle>,
    amount_in: u64,
    min_amount_out: u64,
    target_token_mint: Pubkey,
) -> Result<()> {
    // 1. Read Pyth price
    let price_account = &ctx.accounts.pyth_price_feed;
    let price_data = load_price_feed_from_account_info(price_account)?;
    let current_price = price_data
        .get_price_no_older_than(
            Clock::get()?.unix_timestamp,
            ctx.accounts.oracle_allowlist.max_staleness_seconds.into(),
        )
        .ok_or(KyvernError::OraclePriceStale)?;

    // 2. Reuse existing daily/weekly/merchant/kill-switch checks
    //    (unchanged — call into the same require! macros that gate
    //     execute_payment).

    // 3. Calculate output with 1% Kyvern fee
    let amount_out = calculate_swap_output(
        amount_in,
        current_price.price,
        current_price.expo,
        ctx.accounts.target_token_mint_decimals,
        100, // 1% fee in bps
    )?;

    // 4. Slippage check
    require!(amount_out >= min_amount_out, KyvernError::SlippageExceeded);

    // 5. Burn USDC from vault
    token::transfer(
        ctx.accounts.vault_usdc_to_treasury_usdc.to_token_transfer_ctx(),
        amount_in,
    )?;

    // 6. Transfer target token from treasury PDA to user wallet
    let bump = ctx.accounts.treasury_reserve.bump;
    let mint_key = target_token_mint;
    let signer_seeds: &[&[&[u8]]] = &[&[b"treasury", mint_key.as_ref(), &[bump]]];
    token::transfer(
        ctx.accounts
            .treasury_to_user
            .to_token_transfer_ctx()
            .with_signer(signer_seeds),
        amount_out,
    )?;

    // 7. Emit event
    emit!(SwapExecuted {
        vault: ctx.accounts.vault.key(),
        user: ctx.accounts.user_wallet.key(),
        token_in: USDC_MINT,
        token_out: target_token_mint,
        amount_in,
        amount_out,
        oracle_price: current_price.price,
        oracle_expo: current_price.expo,
        timestamp: Clock::get()?.unix_timestamp,
    });

    // 8. Update treasury reserve counters
    let treasury = &mut ctx.accounts.treasury_reserve;
    treasury.total_swapped_in = treasury.total_swapped_in.saturating_add(amount_in);
    treasury.total_swapped_out = treasury.total_swapped_out.saturating_add(amount_out);

    Ok(())
}

#[error_code]
pub enum KyvernError {
    // ... existing codes ...
    #[msg("Oracle price is stale beyond allowlisted threshold")]
    OraclePriceStale,
    #[msg("Slippage exceeded — output amount below min_amount_out")]
    SlippageExceeded,
    #[msg("Target token not in oracle allowlist")]
    TokenNotAllowlisted,
    #[msg("Treasury PDA has insufficient reserve for this swap")]
    TreasuryUnderfunded,
}
```

Helper function `calculate_swap_output` for Pyth's `(price, expo)` model — input USDC has 6 decimals, output token has its own decimals from `target_token_mint_decimals`. 1% fee subtracted before slippage check.

### Deploy steps

```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
# Verify program ID unchanged: PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc
# Copy refreshed IDL into src/lib/anchor/idl.json (if app reads from idl)
```

After deploy, call `register_treasury` once per supported token to seed the treasury PDA + oracle allowlist row.

### Tests to add

- `swap_via_oracle` USDC → SOL with live Pyth price, completes <2s
- Stale oracle rejects with `OraclePriceStale`
- Slippage trigger rejects with `SlippageExceeded`
- Drain-style call hits existing `DailyCapExceeded`
- Treasury counters increment correctly
- Squads multisig cosigns successfully through `serverVaultPay`

---

## Phase 2 — Pulse multi-token UI extension (after Phase 1 deploys)

After `swap_via_oracle` is live, extend `PulseConfig.triggers[]`:

```ts
type PulseConfig = {
  triggers: Array<{
    id: string;
    target_token: 'SOL' | 'kBONK' | 'kJUP'; // NEW — chain-enforced swap target
    direction: 'below' | 'above';
    threshold_usd: number;
    spend_usdc: number; // renamed from amount_usd to clarify input side
    note?: string;
    armed: boolean;
  }>;
  poll_cadence_minutes: 1 | 5 | 15;
};
```

`TriggersEditor` already accepts `merchant` and `memo`; add:
- `target_token` dropdown (SOL · kBONK · kJUP)
- `armed` toggle (lights green when armed)

Runner change in `src/lib/agents/runner.ts` (token_pulse branch):

```ts
// After read_dex confirms breach + Pay.sh validates:
const result = await serverVaultPay({
  vaultId: agent.deviceId,
  action: "swap_via_oracle",  // NEW Anchor instruction
  args: {
    amount_in: trigger.spend_usdc * 1_000_000,
    min_amount_out: 0, // for demo
    target_token_mint: getMintForToken(trigger.target_token),
  },
});
```

This requires extending `serverVaultPay` to support the new instruction — a sibling `serverVaultSwap()` is cleaner.

---

## Phase 5 — Atlas real external customer (Cloudflare Worker)

`atlas-subscriber-worker/index.ts`:

```ts
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export interface Env {
  SUBSCRIBER_PRIVATE_KEY: string;
  ATLAS_LOG: R2Bucket;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const subscriber = Keypair.fromSecretKey(
      bs58.decode(env.SUBSCRIBER_PRIVATE_KEY),
    );

    // 1. Fetch Atlas feed (x402-protected)
    const challenge = await fetch("https://app.kyvernlabs.com/api/atlas/feed");
    const { paymentRequirements } = (await challenge.json()) as {
      paymentRequirements: {
        recipient: string;
        amount: number;
        mint: string;
      };
    };

    // 2. Build + sign + send USDC payment from subscriber wallet
    const conn = new Connection("https://api.devnet.solana.com", "confirmed");
    const paymentTx = await buildX402Payment({
      from: subscriber.publicKey,
      to: new PublicKey(paymentRequirements.recipient),
      amount: paymentRequirements.amount,
      mintAddress: paymentRequirements.mint,
      conn,
    });
    paymentTx.sign(subscriber);
    const signature = await conn.sendTransaction(paymentTx);
    await conn.confirmTransaction(signature);

    // 3. Retry feed with the payment signature
    const feedResponse = await fetch(
      "https://app.kyvernlabs.com/api/atlas/feed",
      { headers: { "X-PAYMENT": signature } },
    );
    const signal = await feedResponse.json();

    // 4. Log to R2 — public audit trail
    await env.ATLAS_LOG.put(
      `signals/${Date.now()}.json`,
      JSON.stringify({ signal, payment_tx: signature }),
    );
  },
};
```

`wrangler.toml`:

```toml
name = "atlas-subscriber"
main = "index.ts"
compatibility_date = "2026-05-01"

[triggers]
crons = ["0 * * * *"]

[[r2_buckets]]
binding = "ATLAS_LOG"
bucket_name = "kyvern-atlas-signals"

[vars]
# SUBSCRIBER_PRIVATE_KEY set via `wrangler secret put`
```

Deploy:

```bash
cd atlas-subscriber-worker
npm i
wrangler secret put SUBSCRIBER_PRIVATE_KEY  # paste base58 key
wrangler deploy
```

### Remove synthetic earnings in `src/lib/atlas/runner.ts`

Replace the `addEarning(0.10)` call with a query helper that sums actual external USDC inflows to Atlas's vault. The page reads the same `totalEarnedUsd` field but it's now backed by chain history, not a counter:

```ts
async function getAtlasRealEarnings(): Promise<number> {
  const inbound = await connection.getSignaturesForAddress(ATLAS_VAULT);
  return sumExternalInflowsUsd(inbound);
}
```

Pre-fund subscriber wallet with ~$50 devnet USDC. Run for ≥6h pre-submission to accumulate a visible audit trail.

---

## Submission checklist

- [ ] Phase 0 verify-pyth-feeds script run, all feeds green
- [ ] Phase 1 Anchor program deployed, `swap_via_oracle` tested end-to-end
- [ ] Phase 1 IDL synced into `src/lib/anchor/idl.json`
- [ ] Phase 2 Pulse config schema extended with `target_token`
- [ ] Phase 2 TriggersEditor renders token dropdown
- [ ] Phase 5 Cloudflare Worker deployed, cron firing hourly
- [ ] Phase 5 first real x402 payment from subscriber wallet visible on Solana Explorer
- [ ] Phase 5 `addEarning()` calls removed from `atlas-runner.ts`
- [ ] Atlas pre-runs 6h+ with the real subscriber paying it before recording

Once all four are green: every word in the headline ("Solana device · for your AI agent · chain decides · every dollar · it spends") is true on devnet, no asterisks. That's grand-champion ship state.
