# DEPLOY — Kyvern operations runbook

Single source of truth for shipping changes to production. Re-read before every deploy. Last verified: **2026-05-02**, HEAD `a6bca7a` (Phase 8 Revenue Terminal live).

---

## §1 What's running

One Oracle Cloud VM serves **both** `kyvernlabs.com` and `app.kyvernlabs.com` from the same Next.js process on `:3001`. Five pm2 processes keep the trio economy + Atlas observatory + revenue feed alive 24/7. The old `~/kyvernlabs` directory and dormant `kyvernlabs` pm2 process were deleted on 2026-05-01 — there is **one** product on this VM.

Submission deadline: **2026-05-09** (Colosseum Frontier).

---

## §2 VM access

```bash
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190
```

| Path | Role |
|---|---|
| `~/kyvernlabs-commerce/` | This repo — serves both domains via nginx → `:3001` |
| `~/kyvernlabs-commerce/atlas.db` | Atlas state (cycles, signals, ledger) |
| `~/kyvernlabs-commerce/pulse.db` | Agents/signals/tasks/feed_purchases (the trio loop + revenue) |

DNS: both domains CNAME → this VM. nginx terminates TLS and proxies `/` → `127.0.0.1:3001`.

---

## §3 PM2 process inventory (5 processes — all must stay online)

| id | name | cwd | port | purpose | restart trigger |
|---|---|---|---|---|---|
| 8 | `kyvern-commerce` | `~/kyvernlabs-commerce` | 3001 | Next.js web app — both domains | code in `src/**`, `app/**`, API routes |
| 2 | `atlas` | `~/kyvernlabs-commerce` | — | `scripts/atlas-runner.ts` — 3 min cycle | code in `scripts/atlas-*`, `lib/atlas/**` |
| 3 | `atlas-attacker` | `~/kyvernlabs-commerce` | — | `scripts/atlas-attacker.ts` — adversarial probes ~8 min | same as atlas |
| 5 | `agent-pool` | `~/kyvernlabs-commerce` | — | user-spawned worker ticker | code in `lib/agents/**`, `runner.ts`, `tools/**` |
| ? | `buyer-bot` | `~/kyvernlabs-commerce` | — | `scripts/buyer-bot.ts` — pays Atlas $0.01 USDC every 30s | code in `scripts/buyer-bot.ts`, `lib/x402-verify.ts` |

**Always restart agent-pool when you change worker code.** Its JS is loaded once at process boot — deploys silently look successful but workers run stale code until you `pm2 restart agent-pool`.

**Always restart buyer-bot when you change `/api/atlas/feed` or x402 verification.** Same silent-failure pattern.

```bash
# full restart (after any non-trivial deploy)
pm2 restart kyvern-commerce atlas atlas-attacker agent-pool buyer-bot
pm2 save
```

---

## §4 Required env vars (per process)

### kyvern-commerce + atlas + atlas-attacker + agent-pool

```
KYVERN_ATLAS_DB_PATH         = /home/ubuntu/kyvernlabs-commerce/atlas.db
KYVERN_BASE_URL              = http://127.0.0.1:3001
KYVERNLABS_AGENT_KEY         = kv_live_b7b2001e8afa5de06c592a217852f2ca8fe78a60d4b3a49cdedb409665336075
ATLAS_VAULT_ID               = vlt_QcCPbp3XTzHtF5
ATLAS_CYCLE_MS               = 180000
ATLAS_ATTACK_MS              = 480000
PORT                         = 3001          (kyvern-commerce only)
NEXT_PUBLIC_PRIVY_APP_ID     = (Privy dashboard)
PRIVY_APP_SECRET             = (Privy dashboard)
COMMONSTACK_API_KEY          = (Commonstack — gpt-oss-120b)
SOLANA_MAINNET_RPC           = https://mainnet.helius-rpc.com/?api-key=873c5824-7255-40c9-9a39-4d3d04efe717
```

**Helius key expires 2026-05-11** (paid plan, 8 days from 2026-05-03 funding). Wren's whale-watching falls back to public RPC if missing — degraded but not broken.

### buyer-bot (additional)

```
BUYER_BOT_SECRET_B58         = (base58 secret — run scripts/buyer-bot-init.ts to generate)
KYVERN_BASE_URL              = https://app.kyvernlabs.com   (production target — buys from public feed)
SOLANA_RPC_URL               = https://api.devnet.solana.com
```

If `KYVERNLABS_AGENT_KEY` is dropped on `pm2 restart`, the public `/api/atlas/probe` endpoint returns `atlas_offline`. Restore with:

```bash
ssh ... 'KYVERNLABS_AGENT_KEY=kv_live_... pm2 restart kyvern-commerce --update-env && pm2 save'
```

---

## §5 Standard deploy flow

**CRITICAL:** the VM disk runs at 90%+ and SSH sessions die mid-`npm run build`. Always use the nohup + file-marker pattern. A single long SSH command WILL get killed on bad nights, leaving `.next/BUILD_ID` missing and pm2 in a crash loop.

```bash
# 1. push from local
git push origin main

# 2. on the VM, kick off install + build under nohup
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  cd ~/kyvernlabs-commerce &&
  git pull origin main &&
  rm -f /tmp/kyvern-build-done /tmp/kyvern-build-fail &&
  nohup bash -c "npm install --legacy-peer-deps > /tmp/kyvern-install.log 2>&1 && rm -rf .next && npm run build > /tmp/kyvern-build.log 2>&1 && touch /tmp/kyvern-build-done || touch /tmp/kyvern-build-fail" > /dev/null 2>&1 &
  disown
'

# 3. poll for the marker (15s intervals; build takes 90-180s)
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  ls /tmp/kyvern-build-done /tmp/kyvern-build-fail 2>/dev/null
'

# 4. when done — restart all 5 processes + smoke test
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  pm2 restart kyvern-commerce atlas atlas-attacker agent-pool buyer-bot &&
  pm2 save &&
  curl -sS http://127.0.0.1:3001/api/atlas/status | head -c 200 &&
  curl -sS http://127.0.0.1:3001/api/atlas/revenue | head -c 200
'
```

### Pre-deploy safety check

```bash
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  echo "disk:"; df -h / | tail -1
  echo "kyvern HEAD:"; cd ~/kyvernlabs-commerce && git log -1 --oneline
  pm2 list | grep -E "kyvern-commerce|atlas|agent-pool|buyer-bot" | head -8
'
```

### Pre-push local check (avoid stricter-VM-ESLint surprise)

```bash
rm -rf .next && npm run build
```

The VM's ESLint is stricter than local with a cached `.next` — clean local build catches issues before push.

### Post-deploy smoke test

```bash
curl -sS -o /dev/null -w "kyvernlabs.com: %{http_code}\napp.kyvernlabs.com: %{http_code}\n" \
  https://kyvernlabs.com/ https://app.kyvernlabs.com/
curl -sS https://app.kyvernlabs.com/api/atlas/revenue | python3 -m json.tool | head -20
```

---

## §6 Critical addresses & secrets

| Name | Address | Notes |
|---|---|---|
| **Atlas vault PDA** | `925nkpVpSR32WhU8mKWMPC8hnMTJj2DRU9idFeRKHixf` | Squads multisig vault — off-curve |
| **Atlas USDC ATA** | `9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW` | **Use this for Circle faucet** — PDA-owned ATA, but Circle sends to ATA reliably |
| **Atlas Squads multisig** | `7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP` | governance |
| **Kyvern Anchor program** | `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` | devnet — 12 error codes, 4 instructions |
| **Server fee-payer** | `GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ` | drains over time → top up at https://faucet.solana.com |
| **USDC mint (devnet)** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | for token-account derivations |
| **Helius mainnet RPC** | `https://mainnet.helius-rpc.com/?api-key=873c5824-7255-40c9-9a39-4d3d04efe717` | **expires 2026-05-11** |

### Buyer-bot wallet

The buyer-bot signs with a devnet keypair derived from `BUYER_BOT_SECRET_B58`. Generate fresh with:

```bash
npx tsx scripts/buyer-bot-init.ts
# prints public address + base58 secret + USDC ATA
```

Fund the buyer-bot's USDC ATA (≥ $0.50 of devnet USDC) and SOL (~0.05 for fees) before running. Bot self-throttles when USDC balance < $0.01.

---

## §7 Common operational tasks

### Top up Atlas's USDC

1. Open https://faucet.circle.com → Solana Devnet → USDC
2. Paste `9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW` (the **USDC ATA**, not the vault PDA — Circle silently fails on off-curve PDAs)
3. Send $20 (daily cap)
4. Atlas's next 3-min cycle picks it up

### Top up the buyer-bot

Same Circle flow, but the recipient is buyer-bot's USDC ATA (printed by `scripts/buyer-bot-init.ts`).

### Top up the server fee-payer (SOL)

```bash
# 1) get the address
ssh ... 'pm2 env 8 | grep KYVERN_FEE_PAYER_PUBKEY'   # or check known: GZCn…3ZNZ
# 2) airdrop at https://faucet.solana.com (public airdrop is rate-limited; the VM has no solana CLI)
```

If every `vault.pay()` fails simulation with `Attempt to debit an account but found no record of a prior credit` even though USDC is present → fee-payer SOL is 0.

### Verify the trio economic loop

```bash
curl -sS https://app.kyvernlabs.com/api/atlas/status | python3 -m json.tool | grep -E "cycle|state|lastSettled" | head
curl -sS https://app.kyvernlabs.com/api/atlas/revenue | python3 -m json.tool | grep -E "totalRevenueUsd|totalPurchases" | head
```

If `totalPurchases` is increasing every ~30s → buyer-bot + feed are healthy.

### Restart only the agent runtime (worker code change)

```bash
ssh ... 'pm2 restart agent-pool && pm2 save'
```

### Tail Atlas logs

```bash
ssh ... 'pm2 logs atlas --lines 80 --nostream'
```

---

## §8 Land mines (hard-won — don't re-learn)

1. **SSH timeout kills builds.** Always nohup + `/tmp/kyvern-build-done` marker.
2. **VM ESLint is stricter than local with cached `.next`.** Run `rm -rf .next && npm run build` locally before pushing.
3. **`@sqds/multisig@2.1.4` + `@solana/web3.js@>=1.98` crash** with "Cannot set property logs of Error which has only a getter". Patched via `patches/@sqds+multisig+2.1.4.patch` + `postinstall: "patch-package"`. Patches BOTH `index.js` AND `index.mjs` because Next.js webpack resolves from `module` field (→ `.mjs`).
4. **`patch-package` aborts the WHOLE patch on any hunk failure.** If patch context drifts after extending, `rm -rf node_modules/@sqds/multisig && npm install` to get clean source first.
5. **Server fee-payer drains over time.** Symptom: every `vault.pay()` fails simulation. Fix: top up SOL at faucet.solana.com.
6. **`atlas.db` migrations silently skip under WAL lock.** If atlas/atlas-attacker are writing while the web app boots, `ALTER TABLE` can be swallowed. Apply manually with `node -e` if a column is missing.
7. **Worker processes (atlas, atlas-attacker, agent-pool, buyer-bot) need `pm2 restart` after every code change.** Their JS loads once at boot. Deploys appear successful (web app updated, migrations run) but workers behave as if nothing changed. **Always include all 4 in the restart list.**
8. **Build ENOSPC at 92% disk.** Fix: `rm -rf ~/kyvernlabs-commerce.backup-* ~/kyvernlabs-commerce/.next`.
9. **Circle faucet silently fails on PDAs.** Vault PDAs are off-curve. Always paste the **USDC ATA** (`9RnS…7hAW`), never the vault PDA, to Circle.
10. **Next.js statically caches API routes with no request input.** Symptom: `/api/atlas/revenue` returns `$0` even though DB has rows. Fix: `export const dynamic = "force-dynamic"; export const revalidate = 0;` at top of route handler. Already applied to `/api/atlas/revenue`; if you write a new public observability route, do the same.

---

## §9 Public surface URLs

| URL | What it is |
|---|---|
| https://app.kyvernlabs.com/ | Landing — single-brand, live Atlas observatory in the hero |
| https://app.kyvernlabs.com/atlas | Public deep page — timeline, attack button, leaderboard, sponsor card |
| https://app.kyvernlabs.com/vault/new | "Clone Atlas" 60-second deploy wizard |
| https://app.kyvernlabs.com/app | Logged-in device home — DiscoveryHero + RevenueTerminal + LatestOpportunities + Live loop |
| https://app.kyvernlabs.com/app/inbox | Findings — full opportunity stream from all workers |
| https://app.kyvernlabs.com/docs | SDK docs — install, vault.pay, vault.pause, errors |
| https://app.kyvernlabs.com/api/atlas/status | Atlas live state JSON (public) |
| https://app.kyvernlabs.com/api/atlas/revenue | Revenue Terminal rollup (public) |
| https://app.kyvernlabs.com/api/atlas/feed | x402-paid signal feed — 402 without `X-PAYMENT-SIG` |

301-retired (don't rebuild): `/registry`, `/reports`, `/tools`, `/services`, `/launch`, `/provider`, `/changelog`. See `src/middleware.ts`.

---

## §10 Quick-debug recipes

**"Atlas timeline says offline":**
```bash
curl -sS https://app.kyvernlabs.com/api/atlas/probe | head -c 200
# atlas_offline → KYVERNLABS_AGENT_KEY env var lost on restart
ssh ... 'KYVERNLABS_AGENT_KEY=kv_live_... pm2 restart kyvern-commerce --update-env && pm2 save'
```

**"Buyer-bot stopped paying":**
```bash
ssh ... 'pm2 logs buyer-bot --lines 50 --nostream'
# typical causes:
#   - USDC ATA empty → re-top via Circle
#   - SOL balance 0 → airdrop devnet SOL to buyer-bot pubkey
#   - feed returns 502 → kyvern-commerce down → check pm2 list
```

**"Workers stopped finding opportunities":**
```bash
ssh ... 'pm2 logs agent-pool --lines 80 --nostream | grep -iE "error|fail"'
# typical causes:
#   - Commonstack 403 → quota exhausted or model deprecated
#   - All 7 Sentinel sources rate-limited → wait 5 min, ticker auto-resumes
#   - Code change deployed but agent-pool not restarted → pm2 restart agent-pool
```

**"Revenue Terminal shows $0 but DB has rows":**
- Confirmed cause from this session: Next.js static-cached the empty first response.
- Fix already in `src/app/api/atlas/revenue/route.ts` (`force-dynamic` + `revalidate = 0`). If you regress this on a new route, replicate the pattern.

**"`/api/atlas/feed` always returns 402 even with valid signature":**
```bash
# verify the signature on devnet
solana confirm <SIG> --url https://api.devnet.solana.com
# check x402-verify.ts logic — it requires:
#   - tx finalized
#   - postTokenBalances delta ≥ expectedAmountUsdMin to Atlas's USDC ATA
#   - signature not already in feed_purchases (idempotency)
```

---

## §11 Submission day checklist (2026-05-09)

- [ ] Final smoke test of all 4 hero surfaces (`/`, `/atlas`, `/app`, `/vault/new`)
- [ ] Verify `pm2 list` shows all 5 processes online + `pm2 save`
- [ ] Top up Atlas USDC + buyer-bot USDC + server fee-payer SOL
- [ ] Capture 90-second demo video (script: unbox → discovery → delegation → revenue → moat)
- [ ] Submit to Frontier form
- [ ] Submit to KAST form (if relevant track)
- [ ] Pin tweet thread (in `LAUNCH.md`)
- [ ] Post-submit smoke test (both domains, all 5 processes still alive 30 min later)

---

## §12 Anchor program

`anchor/programs/kyvern-policy/` — devnet program ID `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`. 12 error codes, 4 instructions (initialize, update_allowlist, pause/resume, execute_payment).

Currently the live `/api/atlas/probe` and `/api/vault/pay` paths route through Squads `spendingLimitUse` directly, **not** through the Kyvern Anchor program. The Moat section of the landing page demonstrates the program enforcement separately. If we route probes through `execute_payment` later, blocked txs become real failed on-chain transactions with program error codes in Explorer logs (~1-2h work).

---

## §13 SDK publishing

```bash
cd packages/sdk && npm publish --access public
cd packages/create-kyvern-agent && npm publish --access public
```

Sanity test from `/tmp`:

```bash
cd /tmp && npx create-kyvern-agent test-agent@0.1.0 && cd test-agent && cat package.json
```

Org `@kyvernlabs` already exists on npm. `npm whoami` → if it errors, `npm login` first.
