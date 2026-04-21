# kyvern-policy — the on-chain half of KyvernLabs Vault

An Anchor program that extends Squads v4's native spending-limit primitive
with on-chain enforcement of:

- **Merchant allowlist** (SHA-256 hashes of normalized hostnames)
- **Velocity cap** (calls-per-window, sliding window)
- **Memo requirement**
- **Pause** (owner kill-switch)
- **Per-transaction amount cap**

The main instruction `execute_payment` runs these rules against a per-vault
`PolicyAccount` PDA and then **CPIs into Squads v4 `spending_limit_use`** to
settle USDC. If any rule fails, or Squads' own cap check fails, the whole
transaction reverts. Every blocked payment is a real failed Solana tx with a
specific program-error code visible on Explorer.

## Dev setup (one time)

```bash
# 1. Rust + Anchor are already on this machine (rustc 1.90, anchor-cli 0.31.1).
# 2. Install Solana CLI (needed for deploy + anchor build SBF target):
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 3. Set cluster + wallet (devnet; reuses the same server-signer this app uses):
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/projects/myowncompany/kyvernlabs/.kyvern/server-signer.json
```

## Build + generate program ID

```bash
cd anchor
anchor build                  # compiles to target/deploy/kyvern_policy.so

# First time only — generate a real program keypair + sync all declare_id! sites:
anchor keys sync              # rewrites declare_id! in lib.rs AND the Anchor.toml
                              # entries for `programs.devnet` / `programs.localnet`
anchor build                  # rebuild with the real program ID baked in
```

`anchor keys sync` is the step that replaces the placeholder
`Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` (Anchor's canonical template
ID) with a fresh one derived from `target/deploy/kyvern_policy-keypair.json`.

## Deploy to devnet

```bash
cd anchor
anchor deploy --provider.cluster devnet
# → prints "Program Id: <your-program-id>"
# → costs ~1.5 SOL for a fresh deploy; upgrades are cheaper
```

Paste the printed program ID into `src/lib/kyvern-program.ts` on the Next.js
side (`PROGRAM_ID` constant) and into `SUBMISSION.md`'s on-chain proof table.

## Test

```bash
cd anchor
anchor test                   # spins up a local test-validator, deploys the
                              # program, runs tests/kyvern-policy.ts
```

## Architecture at a glance

```
                ┌────────────────────────────────┐
                │  kyvern_policy program         │
                │  (this crate)                  │
                │                                │
                │  PDA: PolicyAccount            │
                │    authority, multisig,        │
                │    per_tx_max, paused,         │
                │    require_memo, velocity…,    │
                │    merchant_allowlist          │
                │                                │
                │  ix:                           │
                │    initialize_policy           │
                │    update_allowlist            │
                │    pause / resume              │
                │    execute_payment ──┐         │
                └──────────────────────┼─────────┘
                                       │ CPI
                                       ▼
                ┌──────────────────────────────────────┐
                │  Squads v4 program (SQDS4ep…52pCf)   │
                │  ix: spending_limit_use              │
                │    enforces daily/weekly USDC cap    │
                │    transfers USDC to destination ATA │
                └──────────────────────────────────────┘
```

Two programs, one atomic transaction. The chain is the policy engine.
