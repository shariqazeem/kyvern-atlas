# Frontier · Phase 0/1/2/5 — current state + remaining deploy steps

Live status of every phase from `KYVERN_FRONTIER_GRAND_CHAMPION_SPEC.md` that needed external deploy work. Updated 2026-05-07 after Phase 1 deploy + Phase 2 runner wire + Phase 5 subscriber landed.

| Phase | State | What's left |
|---|---|---|
| 0 · Pyth devnet feed health check | ✓ script in repo, verified | classic Pyth devnet feeds are dead — Pyth migrated to Pull Oracle. Plan adjusted: Phase 1 uses trusted-oracle-keypair pattern instead. |
| 1 · `swap_via_oracle` Anchor instruction | ✓ DEPLOYED — `swap_via_oracle` live at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` (devnet, slot 460683939, sig `3NQYsYgvHzYL…UQxU`). `ORACLE_SIGNER` set to `Aa4MMPqeTxg3M11RdiRngX9QDBuKmgB5MjRdp9TmxDc` — keypair at `secrets/oracle-signer-keypair.json` (gitignored). | Anchor TS-client wire-up + per-vault policy PDA init for the chain-enforced settlement composition. Today's wire fires real on-chain payments via `coSignPayment` with kyvern-shaped memos for every trigger_fired (visible artifact); the swap_via_oracle ix is ready for the next iteration. |
| 2 · Pulse multi-token UI + runner wire | ✓ `target_token` on PulseConfig + dropdown + Zod schema. ✓ Runner side-effect wired: every `trigger_fired` signal fires `serverVaultPay` with merchant=`kyvern.swap.{TOKEN}` (memo `kvn.swap.{TOKEN} {asset}@${price}`) when `target_token` is set, else Pay.sh-shaped fallback (`gemini-flash · {asset}@${price} · validate trigger`). Signal anchored to chain via `setSignalOnChain`. | Replace `serverVaultPay` with the chain-enforced `swap_via_oracle` ix once policy PDAs are initialized per vault (post-Frontier). |
| 5 · Atlas real customer | ✓ synthetic `addEarning(0.10)` removed from atlas-runner. ✓ `scripts/atlas-subscriber.ts` written — runs as 5th pm2 process on VM, pays Atlas via x402 every hour with idempotent purchase rows in `feed_purchases`. Subscriber wallet `J6okZ5Am3dEoMyxgLTfLH8N9mP3MUd4o666JopyR1fKZ` funded with 0.05 SOL. | **Action required**: fund subscriber with ≥1 USDC at https://faucet.circle.com (devnet · paste pubkey above). Once funded, the cycle runs on its own. Cloudflare Worker version remains the optional cleaner deploy target. |

---

## Phase 0 — Pyth verification (DONE in repo)

Run with:
```bash
npx tsx scripts/verify-pyth-feeds.ts
```

Result on 2026-05-07:
```
✗ SOL/USD    J83w4HKfqxw… → NOT FOUND
✗ USDC/USD   5SSkXsEKQep… → NOT TRADING / bad layout
✗ BTC/USD    HovQMDrbAg… → NOT TRADING / bad layout
✗ ETH/USD    EdVCmQ9FSPc… → NOT FOUND
```

Conclusion: **classic Pyth devnet feeds are dead**. Pyth migrated to Pull Oracle (Hermes-based, receiver program `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ`). Phase 1 source pivots to a trusted-oracle-keypair pattern that's swappable for Pull Oracle later without breaking the instruction shape.

---

## Phase 1 — `swap_via_oracle` (SOURCE COMMITTED · NEEDS DEPLOY)

### What landed

`anchor/programs/kyvern-policy/src/lib.rs`:

- `ORACLE_SIGNER` constant — replace before deploy with your team's signer pubkey
- `MAX_SWAP_USDC_BASE_UNITS` ($50) — global ceiling on per-swap input
- `SWAP_FEE_BPS` (100 = 1%) — Kyvern fee, subtracted from oracle-priced output
- `calculate_swap_output()` — pure-Rust math: input USDC + Pyth-style (price, expo) + target decimals → output base units, with 1% fee + checked u128 arithmetic
- `pub fn swap_via_oracle(ctx, args)` instruction:
  1. Vault not paused
  2. amount_in within `MAX_SWAP_USDC_BASE_UNITS` AND per-tx cap
  3. Oracle signer matches `ORACLE_SIGNER` const + `is_signer == true`
  4. Oracle slot age within `args.max_oracle_age_slots`
  5. Slippage: `amount_out_expected ≥ args.min_amount_out` after 1% fee
  6. Velocity cap (sliding window — same logic as `execute_payment`)
  Emits `SwapExecuted` event with oracle price/expo/slot/timestamp.
- `SwapViaOracleArgs` — amount_in, min_amount_out, target_token_mint, target_decimals, oracle_price, oracle_expo, oracle_published_slot, max_oracle_age_slots
- `SwapViaOracle` accounts struct — policy PDA + member signer + oracle_signer signer (lighter than ExecutePayment because settlement is composed by the runtime as separate ix in the same tx)
- 5 new error codes (6012–6016): `UntrustedOracle`, `OraclePriceStale`, `SlippageExceeded`, `SwapAmountTooLarge`, `SwapMathOverflow`

### Deploy procedure (needs your team's keypair)

Local build verified: `cargo` + `anchor build` runs clean, BPF program is 301KB (well under Solana's 2MB limit).

**The `target/deploy/kyvern_policy-keypair.json` generated locally is a NEW keypair**, not the original upgrade authority for the deployed program. To upgrade `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` you must use the original deploy keypair.

```bash
# 1. Set ORACLE_SIGNER in lib.rs to your real oracle signer pubkey
#    (the keypair the runtime will sign price feeds with).
#    Default placeholder right now is the system program (1111…).

# 2. Place the ORIGINAL keypair (the one whose pubkey is
#    PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc) at:
#    anchor/target/deploy/kyvern_policy-keypair.json

# 3. Make sure your deployer wallet has ≥3 SOL on devnet:
solana balance
# If short, airdrop:
solana airdrop 2

# 4. Build + deploy (this is an UPGRADE, not a fresh deploy):
cd anchor
anchor build
anchor deploy --provider.cluster devnet

# 5. Verify the program ID printed matches PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc.
#    Sync IDL into frontend (no IDL refs found in src/ today; not strictly
#    needed — current frontend uses raw instruction encoding via serverVaultPay).
```

### Phase 1 acceptance tests to add to `anchor/tests/`

- `swap_via_oracle` happy path: SOL price `$182.41` (price=18241000000, expo=-8), $5 USDC in, target_decimals=9 → expects ~0.027 SOL out after 1% fee
- Stale oracle (slot age > max) → `OraclePriceStale`
- Slippage trigger (min_amount_out > expected) → `SlippageExceeded`
- Untrusted oracle signer → `UntrustedOracle`
- amount_in > MAX_SWAP_USDC_BASE_UNITS → `SwapAmountTooLarge`
- Daily/per-tx cap interaction (existing rules still fire) → `AmountExceedsPerTxMax`

---

## Phase 2 — Pulse multi-token UI (LANDED — runner update deferred)

`PulseConfig.triggers[].target_token: 'SOL' | 'kBONK' | 'kJUP'` is now an optional field on the Zod schema + the TriggersEditor renders a dropdown next to each trigger. When the user picks a token, a green "Chain-enforced" pill appears on the trigger row.

The runner does NOT yet read `target_token` — Pulse's existing flow (vault.pay → `merchant: api.pay.sh/gemini`) keeps firing for all triggers. Once Phase 1 is deployed, the runner update is:

```ts
// In src/lib/agents/scripted.ts (or runner.ts), pulse branch:
if (trigger.target_token) {
  // Phase 1 path — chain-enforced swap
  const oraclePrice = await fetchOraclePrice(trigger.target_token);
  const signedPrice = signOraclePrice(oraclePrice, ORACLE_KEYPAIR);
  await serverVaultSwap({
    vaultId: agent.deviceId,
    targetToken: trigger.target_token,
    amountIn: trigger.amount_usd * 1_000_000,
    minAmountOut: 0,
    oraclePrice: signedPrice.price,
    oracleExpo: signedPrice.expo,
    oraclePublishedSlot: signedPrice.slot,
  });
} else {
  // existing path — Pay.sh-shaped vault.pay()
  await serverVaultPay({ ... });
}
```

`serverVaultSwap()` is a new helper that needs to be added to `src/lib/server-pay.ts`. It builds the `swap_via_oracle` instruction, attaches the oracle signer keypair, and routes through the same Squads cosign path as `serverVaultPay`.

---

## Phase 5 — Atlas real customer (PARTIAL — synthetic earnings killed)

### What landed (live)

`src/lib/atlas/runner.ts` — the `addEarning(0.1)` call after every `publish` action is GONE. Atlas's `state.totalEarnedUsd` now ticks ONLY when:

1. External wallet pays via `/api/atlas/feed` x402 (recorded in `feed_purchases` table)
2. Direct USDC transfer arrives at Atlas's vault (visible in vault history)

The page reads the same `totalEarnedUsd` field but it's now backed by chain history, not a counter. **Restart `pm2 restart atlas` after deploy** so the runner picks up the change.

### What's left — Cloudflare Worker

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

    const challenge = await fetch("https://app.kyvernlabs.com/api/atlas/feed");
    const { paymentRequirements } = (await challenge.json()) as {
      paymentRequirements: { recipient: string; amount: number; mint: string };
    };

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

    const feedResponse = await fetch(
      "https://app.kyvernlabs.com/api/atlas/feed",
      { headers: { "X-PAYMENT": signature } },
    );
    const signal = await feedResponse.json();

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
```

Deploy:
```bash
cd atlas-subscriber-worker
npm i
wrangler secret put SUBSCRIBER_PRIVATE_KEY  # paste base58 key
wrangler deploy
```

**Pre-fund subscriber wallet with ~$50 devnet USDC.** Run for ≥6h pre-submission so the audit trail accumulates visible payments before recording.

---

## Submission gating checklist

- [x] Phase 0 — Pyth health check landed
- [x] Phase 1 source — `swap_via_oracle` instruction, `anchor build` clean
- [x] Phase 1 deploy — `solana program deploy` upgraded `PpmZ…MSqc` (sig `3NQYsYgvHzYL…UQxU`, slot 460683939, 2026-05-07). Authority: `C2rBv9mwQ6JXZ9wmoHRdRLjJ9747pkoBT3Fvn5WzqZCh`.
- [x] Phase 1 — `ORACLE_SIGNER` set to `Aa4MMPqeTxg3M11RdiRngX9QDBuKmgB5MjRdp9TmxDc` · keypair gitignored under `secrets/`
- [x] Phase 2 UI — target_token dropdown shipped
- [x] Phase 2 runner — every `trigger_fired` fires `serverVaultPay` with kyvern-shaped memo + `setSignalOnChain` anchors signal to the resulting tx (target_token sets the memo prefix). Chain-enforced `swap_via_oracle` ix wire deferred to post-Frontier (needs per-vault policy PDA init).
- [x] Phase 5 — synthetic addEarning removed
- [x] Phase 5 — `scripts/atlas-subscriber.ts` written + funded with 0.05 SOL · ready to deploy as 5th pm2 process
- [ ] Phase 5 — fund subscriber with ≥1 USDC at https://faucet.circle.com → pubkey `J6okZ5Am3dEoMyxgLTfLH8N9mP3MUd4o666JopyR1fKZ`
- [ ] Phase 5 — first real x402 payment from subscriber wallet visible on Solana Explorer (after USDC funding)
- [ ] Atlas runs ≥6h pre-submit with the real subscriber paying it

Eight of eleven items are green. The remaining three are gated on the user funding the subscriber USDC + letting the cycle run for ≥6h.
