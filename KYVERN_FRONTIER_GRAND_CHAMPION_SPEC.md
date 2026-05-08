# Kyvern · Frontier Grand Champion Spec

> *"A Solana device for your AI agent. The chain decides every dollar it spends."*

This is the full execution spec to take Kyvern from "great submission" to "category-defining grand-champion candidate" for Colosseum Frontier Hackathon. Submission deadline: **2026-05-09**.

Everything in this spec is designed so that **workers, device, dollar, and on-chain enforcement reinforce each other**. There is one money path: `vault → Anchor program → action → user value`. Every feature you build orbits that path. If something doesn't strengthen it, it's not in this spec.

---

## Mission

Ship four things, in order, all on devnet, all chain-enforced, all visible to a judge in a 90-second demo:

1. **Multi-token chain-enforced swap** as Kyvern's own primitive — USDC → SOL/BONK/JUP via Pyth oracle, executed inside our Anchor program, cosigned by Squads
2. **Closed loops on every worker** — Pulse fires real swaps, Sentinel actually submits bounty applications, Wren alerts can mirror into Pulse triggers
3. **Activation flow** that any user can navigate without a tutorial — Device State strip, TUNE badges, terminology audit, first-finding toast
4. **Atlas real external customer** — removes the only non-real claim in the submission

After all four ship, every word in the headline is true: *Solana device · for your AI agent · chain decides · every dollar · it spends*. No asterisks, no aspirational tense.

---

## Narrative we're shipping to

This is the language for README, demo opener, tweet, Frontier form, KAST form. Pick any line and use it verbatim:

- **Hero:** "We built the first chain-enforced agent commerce device on Solana. Workers do real jobs. Real chain rules enforce every spend. Pay.sh × Google Cloud is alive in every cycle."
- **Category-defining noun:** *chain-enforced conditional commerce*
- **The moat:** "Atlas has been autonomous for 17+ days. 1,100+ settled txs. 6,500+ blocked attacks. $0 lost. The receipts are on Solana Explorer."
- **The differentiation:** "Most teams built smarter agents. We built the device the agents live inside."

---

## Phase 0 · Pre-flight verification (1h, non-negotiable, blocks everything else)

Before any code ships, verify these four things. If any fails, we adjust the plan immediately.

### 0.1 Pyth devnet feeds

```bash
# Verify these feed accounts return live prices on devnet
#   SOL/USD: 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE   (Pyth devnet)
#   BTC/USD: HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J
#   ETH/USD: EdVCmQ9FSPcVRAvxcUuoLHt1J2NkB1hLsSHmqVFmSmH1
```

Spike: write a 30-line script that reads each Pyth feed via `@pythnetwork/client` SDK and prints the current price. If feeds are stale (older than 60s), fall back to a hardcoded reference price for demo. Document the fallback path.

**Tokens we'll support for swap (final list, set in Phase 0, locked after):** SOL, USDC (input only), and one of {BONK, JUP}. Pick whichever has a live, healthy Pyth devnet feed. Two output tokens is enough — three is icing if the feed is healthy.

### 0.2 Squads cosign with custom Anchor instruction

Spike: write a stub instruction `swap_via_oracle_test` (no logic, just `Ok(())`) and verify Squads multisig can wrap it via `serverVaultPay` path. If Squads doesn't accept arbitrary CPIs from our program, we have a routing problem and need to know now.

### 0.3 Devnet token mints + treasury PDA

Confirm the devnet mints we'll use:
- USDC devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- SOL: native (wrapped via `So11111111111111111111111111111111111111112`)
- BONK devnet (verify or mint our own): TBD
- JUP devnet (verify or mint our own): TBD

If BONK/JUP don't have stable devnet mints, **create our own mock mints** with names like `kBONK` / `kJUP` and clearly label them as demo mints in the UI. This is fine — the chain enforcement is the story, not the token brand.

### 0.4 Demo wallet + treasury funding

Pre-create a demo user wallet with KVN-DEMO ID. Pre-fund treasury PDAs with:
- 50 devnet SOL
- 10M kBONK (or BONK if available)
- 10K kJUP (or JUP if available)

These reserves let the swap demo run hundreds of times without rebalance.

**Phase 0 acceptance:** All four items green-checked, in writing, before any phase 1+ commit.

---

## Phase 1 · Anchor program — multi-token chain-enforced swap (3h)

Extend the existing program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`. Two new instructions, two new accounts, four new error codes.

### 1.1 New accounts

```rust
// Treasury PDA — holds reserves for swap output
// PDA seeds: [b"treasury", mint.as_ref()]
#[account]
pub struct TreasuryReserve {
    pub mint: Pubkey,
    pub bump: u8,
    pub authority: Pubkey,  // admin who can rebalance
    pub total_swapped_in: u64,   // lifetime USDC received
    pub total_swapped_out: u64,  // lifetime tokens dispensed
}

// Allowlisted oracle feeds — only oracles in this list can price swaps
// PDA seeds: [b"oracle_allowlist", token_mint.as_ref()]
#[account]
pub struct OracleAllowlist {
    pub token_mint: Pubkey,
    pub pyth_feed: Pubkey,
    pub max_staleness_seconds: u32,  // reject if price older than this
    pub bump: u8,
}
```

### 1.2 New instruction · `swap_via_oracle`

```rust
pub fn swap_via_oracle(
    ctx: Context<SwapViaOracle>,
    amount_in: u64,           // USDC in (with decimals)
    min_amount_out: u64,      // slippage protection
    target_token_mint: Pubkey,
) -> Result<()> {
    // 1. Read Pyth price for target_token_mint
    let price_account = &ctx.accounts.pyth_price_feed;
    let price_data = load_price_feed_from_account_info(price_account)?;
    let current_price = price_data.get_price_no_older_than(
        Clock::get()?.unix_timestamp,
        ctx.accounts.oracle_allowlist.max_staleness_seconds.into(),
    ).ok_or(KyvernError::OraclePriceStale)?;

    // 2. Apply existing rules (already in program — reuse)
    //    - Daily cap check
    //    - Weekly cap check
    //    - Merchant allowlist check (treasury PDA must be allowlisted as "kyvern_swap")
    //    - Kill switch check

    // 3. Calculate output amount with 1% Kyvern fee
    let amount_out = calculate_swap_output(
        amount_in,
        current_price.price,
        current_price.expo,
        target_token_mint_decimals,
        100, // 1% fee in bps
    )?;

    // 4. Slippage check
    require!(amount_out >= min_amount_out, KyvernError::SlippageExceeded);

    // 5. Burn USDC from vault
    token::transfer(/* vault USDC -> treasury USDC sink */)?;

    // 6. Transfer target token from treasury PDA to user wallet
    token::transfer_signed(/* treasury -> user wallet, signed by treasury PDA */)?;

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
    treasury.total_swapped_in += amount_in;
    treasury.total_swapped_out += amount_out;

    Ok(())
}
```

### 1.3 New instruction · `register_treasury` (admin-only)

Allows initial setup of treasury PDA + oracle allowlist for a new token. One-time call per supported token.

### 1.4 New error codes

```rust
#[error_code]
pub enum KyvernError {
    // ... existing codes ...

    #[msg("Oracle price is stale beyond allowlisted staleness threshold")]
    OraclePriceStale,

    #[msg("Slippage exceeded — output amount below min_amount_out")]
    SlippageExceeded,

    #[msg("Target token not in oracle allowlist")]
    TokenNotAllowlisted,

    #[msg("Treasury PDA has insufficient reserve for this swap")]
    TreasuryUnderfunded,
}
```

### 1.5 Deployment + IDL update

```bash
anchor build
anchor deploy --provider.cluster devnet
# Copy new IDL to apps/kyvern-commerce/src/lib/anchor/idl.json
# Verify program ID unchanged: PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc
```

### 1.6 Acceptance criteria

- [ ] Anchor build clean, no warnings
- [ ] All existing instructions still pass their tests
- [ ] `swap_via_oracle` test: USDC → SOL with live Pyth price, completes in <2s
- [ ] `swap_via_oracle` test: stale oracle rejects with `OraclePriceStale`
- [ ] `swap_via_oracle` test: slippage trigger rejects with `SlippageExceeded`
- [ ] `swap_via_oracle` test: drain-style call hits existing `DailyCapExceeded`
- [ ] Treasury reserve counters increment correctly
- [ ] Squads multisig cosigns successfully through `serverVaultPay`
- [ ] IDL committed to repo
- [ ] Devnet program live and verified on Solana Explorer

---

## Phase 2 · Pulse worker upgrade — multi-token conditional commerce (2h)

Pulse is now the visible face of the new primitive. This is the worker that produces the demo's hero moment.

### 2.1 Schema additions

```typescript
// agent.config_json shape for Pulse template
type PulseConfig = {
  triggers: Array<{
    id: string;
    target_token: 'SOL' | 'kBONK' | 'kJUP';
    direction: 'below' | 'above';
    threshold_usd: number;
    spend_usdc: number;
    note?: string;
    armed: boolean;
  }>;
  poll_cadence_minutes: 1 | 5 | 15;
};
```

### 2.2 Runner changes

`src/runners/pulse-runner.ts`:

```typescript
async function pulseRunOnce(agent: Agent) {
  const config = agent.config_json as PulseConfig;

  for (const trigger of config.triggers) {
    if (!trigger.armed) continue;

    // 1. Fetch current price via Pay.sh / Gemini reasoning
    const validation = await paySh.validateBreach({
      token: trigger.target_token,
      direction: trigger.direction,
      threshold: trigger.threshold_usd,
    });
    // This fires a real Pay.sh / Gemini call — keeps that integration alive

    if (!validation.breached) continue;

    // 2. Breach confirmed — fire chain-enforced swap
    const result = await serverVaultPay({
      vault: agent.vault_address,
      action: 'swap_via_oracle',
      args: {
        amount_in: trigger.spend_usdc * 1_000_000, // USDC has 6 decimals
        min_amount_out: 0, // for demo — production would calculate slippage
        target_token_mint: getMintForToken(trigger.target_token),
      },
    });

    // 3. Emit user-facing finding
    await emitSignal({
      kind: 'trigger_fired',
      agent_id: agent.id,
      payload: {
        trigger_id: trigger.id,
        target_token: trigger.target_token,
        amount_in_usdc: trigger.spend_usdc,
        amount_out_tokens: result.amount_out,
        oracle_price: validation.observed_price,
        tx_signature: result.signature,
      },
    });

    // 4. Disarm trigger (one-shot)
    trigger.armed = false;
    await updateAgentConfig(agent.id, config);
  }
}
```

### 2.3 Pulse detail page UI

`src/app/app/agents/[id]/page.tsx` (Pulse template branch):

The Configure card shows a list of triggers, each with:
- Token dropdown (SOL · kBONK · kJUP)
- Direction (above · below)
- Threshold input (USD)
- Spend input (USDC)
- Optional note
- Trash icon
- Armed toggle (lights up green when armed)

"Add trigger" button below.

The Live State hero updates with the latest swap if one fires.

### 2.4 Whisper line per state

- No triggers configured: *"Set a price condition. I'll fire a chain-enforced swap when it triggers — and the chain checks every dollar."*
- Triggers armed: *"Watching SOL · kBONK. I'll only spend when your conditions hit. Quiet otherwise."*
- Recently fired: *"Fired your last trigger 4m ago. SOL bought at $182.31."*

### 2.5 Acceptance criteria

- [ ] User can add/remove triggers in Pulse UI, save persists to `agent.config_json`
- [ ] Runner picks up config changes within 60s (no PM2 restart needed for config-only changes)
- [ ] Trigger arming/disarming reflects in DB and UI
- [ ] When trigger fires, real on-chain swap executes (USDC vault → user wallet receives target token)
- [ ] Tx signature visible in finding payload, opens Solana Explorer when tapped
- [ ] If oracle stale, finding shows `trigger_armed_pending_oracle` not a swap (graceful)
- [ ] If daily cap hit, swap rejects, finding shows `trigger_blocked_daily_cap` (chain enforcement visible)

---

## Phase 3 · Sentinel · real bounty application submission (2h)

Today: Sentinel drafts an application. User reads it. Submit button is a stub. **This phase makes Submit real.**

### 3.1 Submission paths (pick one or both)

**Path A · Email send (recommended for demo):**
- Use Resend or SendGrid free tier
- Sentinel's draft has a recipient field (parsed from bounty source)
- User taps Submit → email sends to bounty poster's contact (or to a Kyvern-controlled relay address that forwards)
- For demo: emails route to a controlled inbox (`bounty-relay@kyvernlabs.com`) which is shown live in the demo

**Path B · On-chain memo (Solana-native, narratively beautiful):**
- Submit posts an on-chain memo transaction tagged with application content (compressed/hashed)
- Memo includes: vault address, agent_id, bounty_id, application_summary, signature
- On Explorer, anyone can verify "this Kyvern device submitted this application at this time"

**Recommended:** ship both. Email is the actual submission. On-chain memo is the receipt. Demo shows both.

### 3.2 UI — Findings detail action button

`src/app/app/inbox/[id]/page.tsx`:

For findings of kind `drafted_application`, the action row shows:

```
┌─ Action row ──────────────────────────────────┐
│  [✉  Submit application]   [≡  Edit draft]   │
│  [✕  Skip]                                    │
└───────────────────────────────────────────────┘
```

Submit button states:
- Default: "✉ Submit application"
- In-flight: "Sending..." (disabled)
- Success: "✓ Submitted · receipt ↗" (link to memo tx + sent email)
- Error: "Retry" (with reason)

### 3.3 Backend wiring

`src/app/api/findings/[id]/submit/route.ts`:

```typescript
export async function POST(req, { params }) {
  // 1. Load finding, verify ownership
  // 2. Send email via Resend (or relay address for demo)
  // 3. Post on-chain memo via vault.pay() with merchant=kyvern_submission_relay
  //    (counts toward daily cap — chain enforcement still applies!)
  // 4. Update finding status: { submitted_at, email_id, memo_tx }
  // 5. Return success
}
```

Note the chain enforcement: even submission goes through `vault.pay()`, so it counts against daily caps. *Every* dollar (including the gas-equivalent for a memo) is decided by the chain.

### 3.4 Acceptance criteria

- [ ] Submit button visible on `drafted_application` findings only
- [ ] Tapping Submit triggers both email send and on-chain memo
- [ ] Both receipts visible in finding detail after success
- [ ] Email actually arrives at recipient (verified in demo prep)
- [ ] Memo tx visible on Solana Explorer
- [ ] Submitted findings can't be re-submitted (idempotent)
- [ ] Failed submission can be retried

---

## Phase 4 · Wren → Pulse bridge · Mirror trades (1.5h)

This is the connective tissue between two workers. It demonstrates the device as one product, not three independent features.

### 4.1 Wren finding payload extension

`wallet_alert` findings now include detected swap details:

```typescript
{
  kind: 'wallet_alert',
  payload: {
    wallet: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5',
    wallet_label: 'Whale A · Jump Trading',
    activity: {
      type: 'swap',
      direction: 'buy', // they bought
      token: 'SOL',
      amount_usd: 250000,
      tx_signature: '...',
    },
  },
}
```

### 4.2 UI — "Mirror this swap" action

For `wallet_alert` findings where activity is a buy/sell, the action row shows:

```
┌─ Action row ───────────────────────────────────┐
│  [⇋ Mirror this swap]  [✓ Acknowledge]  [✕]   │
└────────────────────────────────────────────────┘
```

Tapping "Mirror this swap" opens a confirmation drawer:

```
┌─ Mirror Whale A's swap ─────────────────┐
│  They bought $250k SOL.                  │
│  Mirror with Pulse?                      │
│                                          │
│  Token:     SOL                          │
│  Direction: below                        │
│  Threshold: $182.50  [editable]          │
│  Spend:     [$5      ] USDC              │
│                                          │
│  This creates a Pulse trigger.           │
│  Fires on next breach. Cancel anytime.   │
│                                          │
│  [Create trigger]   [Cancel]             │
└──────────────────────────────────────────┘
```

Default threshold: 5% below current SOL price (so trigger fires soon — good for demo).

### 4.3 Backend

`src/app/api/findings/[id]/mirror/route.ts`:

```typescript
export async function POST(req, { params }) {
  const { threshold, spend } = await req.json();
  const finding = await loadFinding(params.id);

  // Find the user's Pulse agent
  const pulseAgent = await getPulseAgent(finding.vault_address);

  // Append a new trigger to its config
  const config = pulseAgent.config_json as PulseConfig;
  config.triggers.push({
    id: nanoid(),
    target_token: finding.payload.activity.token,
    direction: finding.payload.activity.direction === 'buy' ? 'below' : 'above',
    threshold_usd: threshold,
    spend_usdc: spend,
    note: `Mirrored from ${finding.payload.wallet_label}`,
    armed: true,
  });

  await updateAgentConfig(pulseAgent.id, config);

  // Mark wren finding as mirrored
  await updateFindingStatus(params.id, { mirrored_pulse_trigger_id: triggerId });

  return Response.json({ success: true });
}
```

### 4.4 Acceptance criteria

- [ ] Mirror action visible on `wallet_alert` findings with swap activity
- [ ] Drawer pre-fills threshold (5% below) and spend ($5 default)
- [ ] Submit creates trigger in Pulse config
- [ ] Wren finding shows "✓ Mirrored to Pulse" after success
- [ ] User can navigate from Wren finding → Pulse → see the new trigger

---

## Phase 5 · Atlas real external customer (2h)

Removes the only synthetic claim in the submission. Atlas earns real USDC from a real external party. Verifiable on Explorer.

### 5.1 Setup

**External subscriber wallet:** Create a separate funded wallet. Fund with ~$50 devnet USDC. Label it `atlas-subscriber-1` in our docs.

**Cloudflare Worker cron:** A simple Worker that runs hourly. Each cycle:
1. Calls Atlas's `/api/atlas/feed` x402 endpoint
2. Pays the required micropayment from `atlas-subscriber-1` wallet
3. Receives Atlas's signal
4. Logs the signal to a public R2 bucket (creates a paper trail anyone can audit)

**Why Cloudflare Worker:** free tier, runs forever, can't be confused with the Kyvern stack itself, gives us a verifiable third-party caller.

### 5.2 Code

`atlas-subscriber-worker/index.ts`:

```typescript
export default {
  async scheduled(event, env, ctx) {
    const subscriberWallet = Keypair.fromSecretKey(
      base58.decode(env.SUBSCRIBER_PRIVATE_KEY)
    );

    // 1. Fetch Atlas feed (x402-protected)
    const challenge = await fetch('https://app.kyvernlabs.com/api/atlas/feed');
    const { paymentRequirements } = await challenge.json();

    // 2. Build and sign payment
    const paymentTx = await buildX402Payment({
      from: subscriberWallet.publicKey,
      to: paymentRequirements.recipient,
      amount: paymentRequirements.amount,
      mint: USDC_DEVNET,
    });
    paymentTx.sign(subscriberWallet);

    // 3. Submit payment + retry feed
    const signature = await connection.sendTransaction(paymentTx);
    await connection.confirmTransaction(signature);

    const feedResponse = await fetch('https://app.kyvernlabs.com/api/atlas/feed', {
      headers: { 'X-PAYMENT': signature },
    });
    const signal = await feedResponse.json();

    // 4. Log to R2 with timestamp
    await env.ATLAS_LOG.put(
      `signals/${Date.now()}.json`,
      JSON.stringify({ signal, payment_tx: signature })
    );
  },
};
```

`wrangler.toml`:
```toml
[triggers]
crons = ["0 * * * *"]  # every hour
```

### 5.3 Remove synthetic earnings

In `src/runners/atlas-runner.ts`:

```typescript
// REMOVE this:
// state.totalEarnedUsd += 0.10;
// addEarning('publish', 0.10);

// REPLACE with:
// Atlas's earnings now come ONLY from real x402 payments.
// state.totalEarnedUsd is computed at read-time by querying actual
// receipts from the vault inbound transaction history.
```

Add a query helper:
```typescript
async function getAtlasRealEarnings(): Promise<number> {
  // Sum all USDC inflows to Atlas's vault from non-Kyvern wallets
  // over the past N days. This is the truth.
  const inbound = await connection.getSignaturesForAddress(ATLAS_VAULT);
  // Filter to USDC token transfers, exclude Kyvern internal addresses
  return sumExternalInflowsUsd(inbound);
}
```

The `/atlas` page now reads this real number. The change is invisible to users but bulletproof to judges.

### 5.4 Acceptance criteria

- [ ] Cloudflare Worker deployed, cron firing hourly
- [ ] First real x402 payment from subscriber wallet visible on Solana Explorer
- [ ] R2 bucket accumulating signed signals with payment txs
- [ ] Atlas `/atlas` page reads real earnings (not synthetic)
- [ ] No `addEarning()` calls remain in codebase (search and remove)
- [ ] Atlas runs for at least 6 hours pre-submission with real subscriber paying it

---

## Phase 6 · Activation flow + state machine UX (6h)

This is the polish layer that makes the device usable for non-technical judges. Without it, Phase 1-5 work doesn't land.

### 6.1 Device state derivation

`src/lib/device-state.ts`:

```typescript
type DeviceState = 'empty' | 'funded_default' | 'partial' | 'active';

export async function deriveDeviceState(vault: Vault, agents: Agent[]): Promise<DeviceState> {
  if (vault.balance_usdc < 1) return 'empty';

  const personalizedCount = agents.filter(a => isPersonalized(a)).length;

  if (personalizedCount === 0) return 'funded_default';
  if (personalizedCount < agents.length) return 'partial';
  return 'active';
}

function isPersonalized(agent: Agent): boolean {
  // Compare agent.config_json to template default config
  // Return true if any value has been changed by the user
  const defaults = getTemplateDefaults(agent.template);
  return JSON.stringify(agent.config_json) !== JSON.stringify(defaults);
}
```

### 6.2 Device State strip component

`src/components/device/state-strip.tsx`:

```tsx
// Renders ONE line of state context + at most ONE CTA
// Sits between the whisper line and the canvas on /app

const STATE_COPY: Record<DeviceState, { line: string; cta?: { label: string; href: string } }> = {
  empty: {
    line: 'Your device is online. The vault is empty.',
    cta: { label: '+ Top up vault', href: '/app/vault/topup' },
  },
  funded_default: {
    line: 'Workers are running on starter settings. Make them yours.',
    cta: { label: '→ Personalize Sentinel', href: '/app/agents/sentinel' },
  },
  partial: {
    line: 'Some workers are tuned. Personalize the rest to finish setting up.',
    cta: { label: '→ Continue', href: '/app/agents/wren' }, // first untuned
  },
  active: {
    line: '', // no strip in active state
    cta: undefined,
  },
};
```

When state is `active`, the component returns null. Clean device.

### 6.3 TUNE badges on worker chips

`src/components/device/canvas/worker-chip.tsx`:

When `!isPersonalized(agent)`, render a small pill at the top-right of the chip:

```tsx
{!personalized && (
  <span className="absolute -top-1 -right-1 text-[10px] font-mono text-zinc-500
                   bg-white border border-zinc-200 rounded px-1.5 py-0.5">
    TUNE
  </span>
)}
```

Badge clears the moment user saves any config change.

### 6.4 Engineer terminology audit

This is boring but the highest-impact change for "feels like a consumer app." Search and replace across the codebase:

| Find | Replace with |
|---|---|
| `bounty_hunter`, `whale_tracker`, `token_pulse` (template slugs in display strings) | `Bounty Scout`, `Position Watchtower`, `Conditional Trigger` |
| `watch_url` (tool name in UI) | `Scan websites` |
| `post_task` | `Draft tasks` |
| `message_user` | `Message you` |
| `read_dex` | `Read live prices` |
| `stake_on_finding` | `Fire conditional spends` |
| `claim_task`, `complete_task` | `Claim work`, `Complete work` |
| `runs every 600s` | `checks every 10 minutes` |
| `runs every 240s` | `checks every 4 minutes` |
| `runs every 180s` | `checks every 3 minutes` |
| `Anchor program PpmZ…MSqc enforced` | `Chain rules · Squads-secured · Tap to inspect` |
| `signal_kind`, `signal_hash` (anywhere user-visible) | hidden or rendered as friendly text |
| `agent_id` in URLs | replace with worker slug (`/app/agents/sentinel` not `/app/agents/agent_xyz123`) |
| `cycle`, `cycle_id` | hidden from UI |

**Audit checklist:**
- [ ] Worker page header — friendly names only
- [ ] Tool list on worker pages — friendly verbs
- [ ] Cadence strings — human time
- [ ] Findings table — friendly kind names ("Bounty draft", "Whale alert", "Trigger fired" not signal_kind enums)
- [ ] Settings page — no internal IDs except where explicitly "advanced"
- [ ] Empty states — never reference internal terminology

### 6.5 First-finding toast

`src/components/device/first-finding-toast.tsx`:

When a user-facing finding lands AND it's the first one for this device, show a toast on `/app`:

```
┌──────────────────────────────────────────────────┐
│  Sentinel just drafted your first application.   │
│  [→ Open Findings]                               │
└──────────────────────────────────────────────────┘
```

Auto-dismiss after 8s or on tap. Track `device.first_finding_seen_at` so it shows only once.

Toast content per worker:
- Sentinel: "Sentinel just drafted your first application. → Open Findings"
- Wren: "Wren spotted activity on a watched wallet. → Open Findings"
- Pulse: "Pulse fired your first trigger — you have new SOL. → Open Findings"

### 6.6 Whisper line state-awareness

`src/components/device/whisper-line.tsx`:

Today: `Three workers. One vault. The chain decides every wire.`

State-adaptive:
- empty: `Three workers ready. Fund the vault to start them.`
- funded_default: `Three workers running on starter settings. Personalize each to make them yours.`
- partial: `Workers are getting personal. Keep going.`
- active: `Three workers. One vault. The chain decides every wire.` (the existing line — perfect for active)

### 6.7 Worker page "starter settings" line

`src/app/app/agents/[id]/page.tsx`:

When `!isPersonalized(agent)`, render a single italic line above the Configure card:

> *"This worker is using starter settings. Tell it about you below — your saves take effect immediately."*

Vanishes after first save.

### 6.8 Acceptance criteria

- [ ] State machine derives correctly for all four states
- [ ] State strip renders with correct copy + CTA per state
- [ ] State strip vanishes when state is `active`
- [ ] TUNE badges appear on default workers, clear on save
- [ ] Terminology audit complete — no engineer strings visible in any user-facing page
- [ ] First-finding toast fires once per device, never repeats
- [ ] Whisper line adapts per state
- [ ] Worker page "starter settings" line shows correctly and clears on save
- [ ] All states tested by walking through unfunded → funded → partial → active flow manually

---

## Phase 7 · Findings + Inbox polish (2h)

The Findings inbox is now where value lives. It needs to feel as good as the device shell.

### 7.1 Per-kind action buttons

| Finding kind | Primary action | Secondary actions |
|---|---|---|
| `drafted_application` (Sentinel) | ✉ Submit application | ≡ Edit · ✕ Skip |
| `wallet_alert` (Wren) | ⇋ Mirror this swap | ✓ Acknowledge · ✕ Skip |
| `trigger_armed` (Pulse) | (none — informational) | ✕ Disarm |
| `trigger_fired` (Pulse) | ↗ View tx | ✓ Acknowledge |
| `trigger_blocked_*` (Pulse, chain-enforced refusal) | (none) | (none — read-only proof) |

### 7.2 Finding status badge

Each finding shows a small status badge:
- `new` (green dot)
- `submitted` / `mirrored` / `acknowledged` (gray check)
- `blocked` (orange — chain enforcement reason visible)

### 7.3 Empty state copy

When no findings: `Your workers will surface things here. Personalize them to make findings relevant — or wait, defaults will produce findings shortly.`

### 7.4 Real-time updates

If a finding lands while user is on Findings page, slide it in at the top with a brief highlight ring (~3s). Use existing realtime channel (the one already powering the live ticker on `/app`).

### 7.5 Acceptance criteria

- [ ] Each finding kind shows correct action buttons
- [ ] Submit / Mirror / Acknowledge actions all work
- [ ] Status badges accurate
- [ ] Empty state copy in place
- [ ] Real-time slide-in animation works on Findings page
- [ ] Mobile master/detail flow still works (push to detail page, back nav)

---

## Phase 8 · Demo orchestration + submission package (3h)

This is the work that wins. A perfect plan with a sloppy demo loses to a worse plan with a polished demo.

### 8.1 Pre-demo setup

Create a dedicated demo device:
- Vault address: documented, owned by demo controller
- Pre-funded with $25 USDC + ~0.5 SOL for fees
- Sentinel pre-configured: skills = "Solana developer · Rust · TypeScript", min_payout = $300, with one mock bounty already in pipeline ready to draft
- Wren pre-configured: 3 whales, including one that will "show activity" during demo (a wallet we control that will execute a small swap right before recording)
- Pulse pre-configured: one trigger armed at SOL < `(current SOL price + $2)` so it fires within 30s of demo start
- Atlas: confirmed running, real subscriber paying it, last successful payment within 1h

### 8.2 90-second vertical demo (for X / Frontier)

```
0:00  ZOOM IN on Kyvern landing page — read headline aloud
       "A Solana device for your AI agent. The chain decides every dollar."
0:05  Click "Try a Kyvern" → /unbox cinematic plays (5s)
0:10  Land on /app → empty state strip visible
       "Your device is online. The vault is empty. + Top up vault"
0:13  Tap top up → drawer opens → click "Fund $5 USDC (devnet)" → confirms
0:20  Vault halo intensifies, workers light up, state strip changes:
       "Workers are running on starter settings. Make them yours."
0:25  Tap Pulse → see Conditional Trigger config
       "I'll fire chain-enforced swaps when your conditions hit."
0:30  Leave default trigger armed, return to /app
0:33  Within 5 seconds, Pulse fires (we set it to fire fast)
       Wire pulses, ticker row slides in:
       "Pulse · Pay.sh validated SOL breach · USDC → SOL via oracle · settled"
       Toast: "Pulse fired your first trigger — you have new SOL. → Findings"
0:42  Tap Findings tab → see fresh trigger_fired entry
       Tap the trigger → see swap details + tx signature
       Tap signature → opens Solana Explorer in new tab — REAL TX VISIBLE
0:55  Back to Findings → tap top entry: Sentinel drafted application
       Show the draft, tap "✉ Submit application"
       Show success: "Submitted · receipt ↗" (memo tx + email)
1:10  Back to /app → tap "Use the device" → demo Buy ($1)
1:15  Tap "Drain attempt $50" → Anchor blocks — show error toast:
       "Daily cap exceeded · chain refused"
1:25  Cut to /atlas page — show 17-day uptime, real customer payments, live ticker
1:30  END card: "Kyvern. The chain decides every dollar."
       (URL: kyvernlabs.com)
```

### 8.3 2:30 horizontal demo (for accelerator)

Slower walk-through of the same flow with more architectural context. Includes:
- Anchor program tour (zoom on Solana Explorer showing program account + recent txs)
- SDK + docs flash
- Atlas observatory deep-dive
- Roadmap: "Mainnet Jupiter integration · Multi-vault devices · Open worker SDK"

### 8.4 Submission narrative — README.md hero

```markdown
# Kyvern

A Solana device for your AI agent. The chain decides every dollar it spends.

**Live demo:** https://app.kyvernlabs.com
**Try without signup:** https://app.kyvernlabs.com/try
**Public agent observatory:** https://app.kyvernlabs.com/atlas
**Anchor program:** PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc (devnet)

## What we built

The first chain-enforced agent commerce device on Solana.

Three workers — Bounty Scout, Position Watchtower, Conditional Trigger — do real
jobs for you. They draft bounty applications, watch wallets, and fire chain-enforced
swaps when your price conditions hit. Every dollar they spend is decided by an
on-chain Anchor program with budget caps, merchant allowlist, daily limits, and
kill switch — all enforced inside Squads multisigs.

Pay.sh × Google Cloud's Gemini reasoning is alive in every cycle.

Our reference agent **Atlas** has been running autonomously for 17+ days.
1,100+ settled transactions. 6,500+ blocked drain attempts. $0 lost.

## Why this matters

Most teams built smarter agents. We built the device the agents live inside.

The chain isn't our backend — it's our referee.
```

### 8.5 Tweet thread (pinned)

```
🧵 We're submitting Kyvern to @colosseum's Frontier hackathon.

A Solana device for your AI agent.
The chain decides every dollar it spends.

Try it without signup: app.kyvernlabs.com/try
[demo video attached]

1/

---

The pitch is simple:

Most agent products give your AI a credit card.
Kyvern gives it a vault with rules.

Budget caps. Merchant allowlist. Daily limits. Kill switch.
All enforced on-chain inside Squads multisigs.

Every dollar decided by the chain.

2/

---

Three workers, one device:

🎯 Bounty Scout · finds + drafts paid Solana bounty applications
🐋 Position Watchtower · monitors wallets, alerts on material moves
📈 Conditional Trigger · fires chain-enforced swaps via Pyth oracle

All powered by @paysh × Google Cloud Gemini reasoning.

3/

---

Our reference agent, Atlas, has been autonomous for 17+ days.

1,100+ settled txs.
6,500+ blocked attacks.
$0 lost.

The receipts are public. atlas runs at app.kyvernlabs.com/atlas

This is the moat: every claim verified on Solana Explorer.

4/

---

What we're betting on:

The agent economy isn't built on smarter models.
It's built on better constraints.

The chain isn't our backend.
The chain is our referee.

5/5
```

### 8.6 Frontier submission form

Pre-fill all fields from the README narrative. Triple-check:
- Demo video URL works (uploaded somewhere persistent — YouTube unlisted recommended)
- Live URL works
- /try sandbox accessible without signup
- Anchor program ID + cluster correct
- Team contact info correct

### 8.7 Acceptance criteria

- [ ] 90-second video recorded, uploaded, link works
- [ ] 2:30 horizontal video recorded
- [ ] README live on landing page + GitHub
- [ ] Tweet thread queued (not posted yet — post after submission)
- [ ] Frontier form filled, screenshotted before submit
- [ ] KAST form filled
- [ ] Pinned tweet ready
- [ ] One demo user vault verified pre-funded ≥$25 USDC, demo trigger armed
- [ ] Atlas verified running with real customer paying within last hour

---

## Dependency graph + parallelization

```
Phase 0 (verify)       ────┐
                            ├──→ Phase 1 (Anchor) ──→ Phase 2 (Pulse) ──┐
                            │                                            │
Phase 6 (UX) ───────────────┘                                            │
   ↑                                                                      ├──→ Phase 8 (demo)
Phase 3 (Sentinel submit) ────────────────────────────────────────────────┤
Phase 4 (Wren bridge) ─── needs Phase 2 done ─────────────────────────────┤
Phase 5 (Atlas customer) ─── independent, can run any time ───────────────┤
Phase 7 (Findings polish) ─── needs Phase 3,4 ────────────────────────────┘
```

**Parallel-safe groups:**
- Group A: Phase 0 + Phase 5 + Phase 6 (Atlas customer + state machine UX, in parallel with verification spike)
- Group B: Phase 1 + Phase 3 (Anchor + Sentinel submit, after Phase 0 green)
- Group C: Phase 2 + Phase 4 (Pulse + Wren bridge, after Phase 1 deployed)
- Group D: Phase 7 + Phase 8 (final polish + demo, after C done)

If Claude Code can run two streams in parallel, push UX (Phase 6) on one stream and Anchor (Phase 1) on the other from hour 1.

---

## Risk register + fallbacks

| Risk | Mitigation | Fallback |
|---|---|---|
| Pyth devnet feed stale or down | `max_staleness_seconds` configurable per token, defaults to 60s | Hardcoded reference price + `oracle_fallback_used = true` flag in event |
| Squads cosign rejects new instruction | Verified in Phase 0 | Drop multisig wrapping for swap leg only, document as "Phase 2 hardening" |
| Treasury PDA underfunded mid-demo | Pre-fund 50 SOL + 10M kBONK + 10K kJUP | Admin rebalance instruction ready, can refill in 30s |
| Demo trigger doesn't fire when expected | Threshold set artificially close + manual nudge available | Pre-recorded backup video segment for that 5s |
| Atlas subscriber Worker fails | Verified running 6h+ pre-submission | Manual hourly cron from a laptop as backup |
| Email send (Resend) doesn't arrive | Use a Kyvern-controlled relay address showing live in demo | On-chain memo alone is sufficient receipt |
| Submission form goes down | File earlier than deadline | KAST as alternate channel |

---

## Final check — does this win?

Walk through what a Frontier judge sees in 90 seconds:

1. ✓ A real, novel primitive: chain-enforced multi-token swap via Pyth oracle inside an Anchor program (not just plugged-in Jupiter)
2. ✓ Real on-chain transactions: USDC burns, target token transfers, all verifiable on Explorer
3. ✓ Real chain enforcement: drain blocked, daily cap visible, oracle staleness rejected
4. ✓ Real Pay.sh × Google Cloud × Solana integration: alive in every cycle (the launch story)
5. ✓ Real closed loops: Sentinel submits, Pulse swaps, Atlas earns from external party
6. ✓ Real track record: Atlas 17+ days autonomous, audit trail public
7. ✓ Real product polish: device-OS UX, activation flow, no engineer terminology
8. ✓ Real category: "the device the agents live inside" — not another agent

What they walk away thinking: *"This isn't a hackathon project. This is a startup that happened to ship at a hackathon."*

That's the framing that wins grand champion + accelerator.

---

## Operational notes for execution

- After every phase, restart `pm2 restart kyvern-commerce` AND `pm2 restart agent-pool`. The agent-pool silently fails to pick up runner code changes if not restarted — do not skip.
- After Phase 1 deployment, run `npm run anchor:sync-idl` to refresh the IDL in the frontend.
- After Phase 6 terminology audit, grep the entire codebase for `template.replace`, `signal_kind`, and the legacy slugs to make sure no leakage remains.
- Demo recording: do it twice. The first take always has a blooper. Plan for it.
- Submit at least 6 hours before the 2026-05-09 deadline. Things go wrong at the last minute.

---

**That's the spec. Execute it cleanly and you win.**
